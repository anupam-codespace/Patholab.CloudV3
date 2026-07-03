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
  User, Hash, Building2, TestTube, ArrowUpRight, ArrowDownRight, Activity, Calendar
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import toast from "react-hot-toast";
import { Wand2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

  // Fetch Templates / Macros
  const { data: macros } = useQuery({
    queryKey: ["radiology-macros"],
    queryFn: async () => {
      const res = await fetch("/api/workspace/radiology/macros");
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Handle Macro Insertion
  const handleApplyMacro = (macroId: string) => {
    const macro = macros?.find((m: any) => m.id === macroId);
    if (!macro) return;

    // Update the selected study with macro text
    setSelectedStudy((prev: any) => ({
      ...prev,
      findings: macro.findingsText,
      impression: macro.impressionText,
    }));
    
    toast.success(`${macro.title} template applied`);
  };

  // 2. Queries
  const { data: queue = [], isLoading: isQueueLoading } = useQuery({
    queryKey: ["radiology-queue"],
    queryFn: fetchQueue,
    refetchInterval: 30000, // Auto-refresh queue every 30 seconds
  });

 // const { data: macros = [] } = useQuery({
    //queryKey: ["radiology-macros"],
  //  queryFn: fetchMacros,
  //  staleTime: 5 * 60 * 1000, // Cache macros for 5 mins
//});

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
  // 🧠 THE SMART MACRO ENGINE
  // ==========================================
  const handleSmartText = (field: 'findings' | 'impression', value: string) => {
    let text = value;

    // Check if the user just typed a space, triggering the macro check
    if (text.endsWith(" ")) {
      const words = text.split(/\s+/);
      const lastWord = words[words.length - 2]; // The word just typed before the space

      if (lastWord && lastWord.startsWith("/")) {
        const typedShortcode = lastWord.substring(1).toLowerCase();

        // Find the matching macro
        const matchedMacro = macros?.find(
          (m: any) =>
            m.shortcode &&
            m.shortcode.toLowerCase() === typedShortcode
        );

        if (matchedMacro) {
          // 1. Replace the typed "/shortcode" with the actual heavy text
          const regex = new RegExp(`/${matchedMacro.shortcode}\\s$`, "i");
          const replacementText = field === 'findings' ? matchedMacro.findingsText : matchedMacro.impressionText;
          text = text.replace(regex, replacementText + "\n\n");

          // 2. MAGIC AUTO-FILL: Fill the other box if it's currently empty
          const currentImpression = selectedStudy?.impression || "";
          const currentFindings = selectedStudy?.findings || "";

          setSelectedStudy((prev: any) => ({
            ...prev,
            [field]: text, // Update the field they are typing in
            // If they typed in findings and impression is empty, fill impression
            ...(field === 'findings' && !currentImpression && matchedMacro.impressionText 
                ? { impression: matchedMacro.impressionText } : {}),
            // If they typed in impression and findings is empty, fill findings
            ...(field === 'impression' && !currentFindings && matchedMacro.findingsText 
                ? { findings: matchedMacro.findingsText } : {})
          }));

          toast.success(`Expanded Macro: ${matchedMacro.title}`);
          return; // Exit early since state is updated
        }
      }
    }

    // Normal typing update if no macro was triggered
    setSelectedStudy((prev: any) => ({ ...prev, [field]: text }));
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

    {/* ========================================== */}
      {/* 3-COLUMN RESPONSIVE SPLIT PANE MAIN CONTENT */}
      {/* ========================================== */}
      {/* On mobile: Stacks vertically & scrolls. On laptops (lg+): Locks to screen height. */}
      <main className="flex-1 w-full max-w-[1920px] mx-auto px-2 sm:px-4 lg:px-6 pb-4 flex flex-col lg:flex-row gap-4 relative z-10 lg:h-[calc(100vh-5rem)] overflow-y-auto lg:overflow-hidden">
        
        {/* ========================================== */}
        {/* COLUMN 1: PATIENT QUEUE                    */}
        {/* ========================================== */}
        {/* Mobile: 400px height. Laptop: 280px wide. Desktop: 320px wide. */}
        <div className="w-full lg:w-[280px] xl:w-[300px] 2xl:w-[320px] flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden shrink-0 h-[400px] lg:h-full">
          <div className="p-3 border-b border-slate-100 bg-slate-50/50 space-y-3 shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search patient..."
                className="pl-9 bg-white border-slate-200 focus:border-indigo-300 focus:ring-indigo-500/20 rounded-lg h-9 text-sm shadow-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-1 bg-slate-100/80 p-1 rounded-lg border border-slate-200/50">
              {["UNREAD", "DRAFT", "ALL"].map((filter) => (
                <button
                  key={filter}
                  onClick={() => setActiveFilter(filter)}
                  className={`flex-1 py-1 text-[10px] uppercase tracking-wider font-bold rounded-md transition-all ${
                    activeFilter === filter
                      ? "bg-white text-indigo-700 shadow-sm border border-slate-200/50"
                      : "text-slate-500 hover:text-slate-800"
                  }`}>
                  {filter}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-slate-100">
            {filteredQueue.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center text-slate-400">
                <CheckCircle2 className="h-10 w-10 mx-auto mb-3 opacity-30 text-emerald-500" />
                <p className="text-sm font-bold text-slate-600">Queue is clear</p>
              </div>
            ) : (
              filteredQueue.map((item: any) => {
                const isSelected = selectedStudy?.studyId === item.studyId;
                
                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedStudy(item)}
                    className={`p-3 cursor-pointer transition-all border-l-4 group ${
                      isSelected ? "bg-indigo-50/50 border-l-indigo-600" : item.status === "DRAFT" ? "border-l-amber-400 hover:bg-slate-50/80" : "border-l-transparent hover:bg-slate-50/80"
                    }`}>
                    <div className="flex justify-between items-start mb-1 gap-2">
                      <h3 className={`font-bold text-sm truncate ${isSelected ? "text-indigo-900" : "text-slate-900"}`}>
                        {item.patient || "Unknown Patient"}
                      </h3>
                      {item.priority === "URGENT" && (
                        <div className="h-2 w-2 rounded-full bg-rose-500 animate-pulse mt-1 shrink-0" />
                      )}
                    </div>
                    <p className="text-xs font-medium text-slate-600 mb-2 truncate" title={item.scan}>{item.scan}</p>
                    <div className="flex justify-between items-center mt-2 flex-wrap gap-2">
                      <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-wider bg-white border-slate-200 text-slate-700 shadow-sm">
                        {item.modality}
                      </Badge>
                      <span className="text-[10px] font-medium text-slate-500">{item.time}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {selectedStudy ? (
          <>
            {/* ========================================== */}
            {/* COLUMN 2: CLINICAL CONTEXT                 */}
            {/* ========================================== */}
            {/* Mobile: Expands to fit content. Laptop: 300px wide. Desktop: 350-400px wide. */}
            <div className="w-full lg:w-[300px] xl:w-[350px] 2xl:w-[400px] flex flex-col gap-4 overflow-y-auto custom-scrollbar shrink-0 h-auto lg:h-full pb-4 lg:pb-10 pr-1 lg:pr-2">
              
              {/* 1. Patient Information */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden shrink-0">
                <div className="bg-slate-900 px-3 py-2 flex items-center gap-2 text-white">
                  <User className="h-4 w-4 text-indigo-400" />
                  <h3 className="font-bold text-[11px] uppercase tracking-wider">Patient Info</h3>
                </div>
                <div className="p-3 space-y-2.5">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                    <span className="text-[11px] text-slate-500 font-medium">Name</span>
                    <span className="text-xs font-bold text-slate-900">{selectedStudy.patient || "Amit Kumar"}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                    <span className="text-[11px] text-slate-500 font-medium">Age / Gender</span>
                    <span className="text-xs font-semibold text-slate-700">{selectedStudy.age || "54 Y"} / {selectedStudy.gender || "M"}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                    <span className="text-[11px] text-slate-500 font-medium">UHID</span>
                    <span className="text-xs font-mono text-slate-700">{selectedStudy.uhid || "UH202600124"}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                    <span className="text-[11px] text-slate-500 font-medium">Ref Doctor</span>
                    <span className="text-xs font-semibold text-indigo-700 truncate max-w-[120px] text-right">{selectedStudy.referringDoctor || "Dr. Sharma"}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                    <span className="text-[11px] text-slate-500 font-medium">Department</span>
                    <span className="text-xs font-semibold text-slate-700">{selectedStudy.department || "Neurology"}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] text-slate-500 font-medium">Priority</span>
                    <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded flex items-center gap-1 border border-rose-100">
                      <div className="h-1.5 w-1.5 rounded-full bg-rose-500" /> {selectedStudy.priority || "URGENT"}
                    </span>
                  </div>
                </div>
              </div>

              {/* 2. Clinical History */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden shrink-0">
                <div className="bg-amber-50 px-3 py-2 flex items-center gap-2 border-b border-amber-100">
                  <History className="h-4 w-4 text-amber-600" />
                  <h3 className="font-bold text-[11px] uppercase tracking-wider text-amber-900">Clinical History</h3>
                </div>
                <div className="p-3 space-y-4">
                  <div>
                    <h4 className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Chief Complaint</h4>
                    <p className="text-xs font-semibold text-slate-800 bg-slate-50 p-2 rounded border border-slate-100">
                      {selectedStudy.complaint || "Severe headache for 2 months"}
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <h4 className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Symptoms</h4>
                      <ul className="text-[11px] font-medium text-slate-700 space-y-1 list-disc pl-3 marker:text-indigo-400">
                        <li>Vomiting</li>
                        <li>Dizziness</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Medication</h4>
                      <ul className="text-[11px] font-medium text-slate-700 space-y-1 list-disc pl-3 marker:text-emerald-400">
                        <li>Aspirin</li>
                        <li>Metformin</li>
                      </ul>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Past History</h4>
                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 text-[9px] px-1.5">Diabetes</Badge>
                      <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 text-[9px] px-1.5">Hypertension</Badge>
                      <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-[9px] px-1.5">Stroke (2023)</Badge>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Previous Studies */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden shrink-0">
                <div className="bg-slate-50 px-3 py-2 flex items-center gap-2 border-b border-slate-100">
                  <FileText className="h-4 w-4 text-slate-600" />
                  <h3 className="font-bold text-[11px] uppercase tracking-wider text-slate-700">Previous Studies</h3>
                </div>
                <div className="divide-y divide-slate-100">
                  {[
                    { name: "MRI Brain", date: "15-Jan-2026" },
                    { name: "CT Brain", date: "04-Oct-2025" }
                  ].map((study, idx) => (
                    <div key={idx} className="p-2.5 flex items-center justify-between hover:bg-slate-50 transition-colors">
                      <div>
                        <p className="text-xs font-bold text-slate-800">{study.name}</p>
                        <p className="text-[10px] text-slate-500">{study.date}</p>
                      </div>
                      <Button variant="outline" size="sm" className="h-6 px-2 text-[9px] font-bold border-indigo-200 text-indigo-700 hover:bg-indigo-50">
                        View
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ========================================== */}
            {/* COLUMN 3: REPORT EDITOR                    */}
            {/* ========================================== */}
            {/* Flex-1 means it takes up all remaining space! */}
            <div className="flex-1 flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden relative min-h-[600px] lg:min-h-0 lg:h-full w-full">
              
              {/* Toolbar */}
              <div className="px-3 py-2.5 border-b border-slate-100 bg-slate-50/80 shrink-0 flex flex-wrap justify-between items-center gap-2">
                <div className="flex items-center gap-2">
                  <Wand2 className="h-4 w-4 text-indigo-600 hidden sm:block" />
                  <span className="text-sm font-bold text-slate-800">Editor</span>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Select onValueChange={handleApplyMacro}>
                    <SelectTrigger className="flex-1 sm:w-[200px] xl:w-[220px] h-8 bg-white border-slate-200 text-xs shadow-sm">
                      <SelectValue placeholder="Load Macro..." />
                    </SelectTrigger>
                    <SelectContent>
                      {macros?.length === 0 ? (
                        <SelectItem value="none" disabled>No templates</SelectItem>
                      ) : (
                        macros?.map((macro: any) => (
                          <SelectItem key={macro.id} value={macro.id}>{macro.title}</SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={() => window.open(`http://localhost:8042/viewer?StudyInstanceUID=${selectedStudy.studyUid}`, "_blank")}
                    className="h-8 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg shadow-sm shrink-0">
                    <MonitorPlay className="h-3 w-3 sm:mr-1.5" /> <span className="hidden sm:inline">View DICOM</span>
                  </Button>
                </div>
              </div>

              {/* Editor Body */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-3 sm:p-5 flex flex-col gap-4">
                
                {/* Findings */}
                <div className="space-y-1.5 flex-1 flex flex-col">
                  <label className="text-xs font-bold text-slate-700 flex flex-wrap items-center justify-between gap-2">
                    <span>Technique & Findings</span>
                    <span className="text-[9px] font-normal text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                      Type <kbd className="font-mono text-slate-600">/shortcode</kbd> + Space
                    </span>
                  </label>
                  <Textarea 
                    placeholder="Describe findings or type a /shortcut..." 
                    className="flex-1 min-h-[250px] font-sans text-sm leading-relaxed bg-slate-50/50 border-slate-200 focus-visible:ring-indigo-500 p-4 shadow-inner resize-none"
                    value={selectedStudy?.findings || ""}
                    onChange={(e) => handleSmartText('findings', e.target.value)}
                  />
                </div>

                {/* Impression */}
                <div className="space-y-1.5 h-[150px] xl:h-[200px] flex flex-col shrink-0">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <AlertCircle className="h-3.5 w-3.5 text-indigo-600" />
                    Impression / Conclusion
                  </label>
                  <Textarea 
                    placeholder="Final diagnosis or type a /shortcut..." 
                    className="flex-1 font-sans text-sm font-semibold leading-relaxed bg-slate-50/50 border-slate-200 focus-visible:ring-indigo-500 p-4 shadow-inner resize-none"
                    value={selectedStudy?.impression || ""}
                    onChange={(e) => handleSmartText('impression', e.target.value)}
                  />
                </div>
              </div>

              {/* Footer Actions */}
              <div className="p-3 border-t border-slate-100 bg-slate-50 flex justify-between items-center shrink-0">
                <Button variant="outline" className="h-9 text-xs font-bold text-slate-600 bg-white border-slate-200 shadow-sm">
                  <Save className="h-3 w-3 mr-2 text-slate-400" /> Save Draft
                </Button>
                <Button className="h-9 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm px-6">
                  <FileSignature className="h-3 w-3 mr-2" /> Verify & Sign
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="h-20 w-20 bg-slate-50 rounded-full flex items-center justify-center shadow-sm mb-4 border border-slate-100">
              <Stethoscope className="h-8 w-8 text-indigo-300" />
            </div>
            <h3 className="text-lg font-bold text-slate-700 mb-1">Ready to Report</h3>
            <p className="text-xs text-center max-w-sm leading-relaxed text-slate-500">
              Select a patient from the queue to begin reporting.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
