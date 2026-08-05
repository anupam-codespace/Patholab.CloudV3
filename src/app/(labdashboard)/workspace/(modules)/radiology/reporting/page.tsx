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
  User, TestTube
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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

  // ==========================================
  // 🟢 TOP LEVEL REACT HOOKS (Moved here to fix the crash!)
  // ==========================================

  // 1. Fetch Macros
  const { data: macros = [] } = useQuery({
    queryKey: ["radiology-macros"],
    queryFn: fetchMacros, // Fixed API path
  });

  // 2. Fetch Queue
  const { data: queue = [], isLoading: isQueueLoading } = useQuery({
    queryKey: ["radiology-queue"],
    queryFn: fetchQueue,
    refetchInterval: 30000, 
  });

  // 3. Fetch deep clinical context ONLY when a patient is clicked
  const { data: patientContext, isLoading: isContextLoading } = useQuery({
    queryKey: ["patient-context", selectedStudy?.patientId],
    queryFn: async () => {
      const res = await fetch(`/api/workspace/radiology/patient-context?patientId=${selectedStudy.patientId}&currentStudyId=${selectedStudy.id}`);
      if (!res.ok) throw new Error("Failed to load context");
      return res.json();
    },
    enabled: !!selectedStudy?.patientId, 
  });

  // ==========================================
  // 🟢 MUTATIONS & HANDLERS
  // ==========================================

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
      toast.success(data.message || "Report saved successfully");
      queryClient.invalidateQueries({ queryKey: ["radiology-queue"] });

      if (variables.action === "FINALIZE") {
        setSelectedStudy(null);
        window.open(`/workspace/radiology/print/${variables.studyId}`, "_blank");
      } else {
        setSelectedStudy((prev: any) => ({ ...prev, status: "DRAFT" }));
      }
    },
    onError: (error: any) => toast.error(error.message),
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

  const handleApplyMacro = (macroId: string) => {
  const macro = macros?.find((m: any) => m.id === macroId);

  if (!macro || !selectedStudy) return;

  const findings = injectVariables(
    macro.findingsText || "",
    selectedStudy
  );

  const impression = injectVariables(
    macro.impressionText || "",
    selectedStudy
  );

  setSelectedStudy((prev: any) => ({
    ...prev,
    findings,
    impression,
  }));

  toast.success(`${macro.title} template applied`);
};

  // ==========================================
  // 🧠 THE SMART MACRO ENGINE (Upgraded with Dynamic Variables)
  // ==========================================
  
  // Helper function to inject patient data into macro text
 const injectVariables = (templateText: string, study: any) => {
  if (!templateText) return "";

  const patientName =
    typeof study?.patient === "string"
      ? study.patient
      : study?.patient?.name ??
        study?.patientName ??
        "Unknown Patient";

  const age =
    study?.age ??
    study?.patientAge ??
    study?.patient?.age ??
    "N/A";

  const gender =
    study?.gender ??
    study?.patientGender ??
    study?.patient?.gender ??
    "N/A";

  const modality =
    typeof study?.modality === "string"
      ? study.modality
      : study?.modality?.type ??
        study?.modality?.name ??
        study?.modalityType ??
        "N/A";

  const uhid =
    study?.uhid ??
    study?.patient?.patientId ??
    study?.patient?.uhid ??
    "N/A";

  const referringDoctor =
    study?.referringDoctor ??
    study?.refDoctor ??
    study?.referringPhysician ??
    "N/A";

  return templateText
    .replace(/\[Patient Name\]/gi, String(patientName))
    .replace(/\[Age\]/gi, String(age))
    .replace(/\[Gender\]/gi, String(gender))
    .replace(/\[Modality\]/gi, String(modality))
    .replace(/\[UHID\]/gi, String(uhid))
    .replace(/\[Ref Doctor\]/gi, String(referringDoctor));
};

  const handleSmartText = (field: 'findings' | 'impression', value: string) => {
    let text = value;

    if (text.endsWith(" ")) {
      const words = text.split(/\s+/);
      const lastWord = words[words.length - 2]; 

      if (lastWord && lastWord.startsWith("/")) {
        const typedShortcode = lastWord.substring(1).toLowerCase();
        const matchedMacro = macros?.find(
          (m: any) => m.shortcode && m.shortcode.toLowerCase() === typedShortcode
        );

        if (matchedMacro) {
          const regex = new RegExp(`/${matchedMacro.shortcode}\\s$`, "i");
          
          // Inject dynamic variables into the raw macro text before applying it!
          const rawReplacementText = field === 'findings' ? matchedMacro.findingsText : matchedMacro.impressionText;
          const replacementText = injectVariables(rawReplacementText, selectedStudy);
          
          text = text.replace(regex, replacementText + "\n\n");

          const currentImpression = selectedStudy?.impression || "";
          const currentFindings = selectedStudy?.findings || "";

          // Also inject variables into the auto-fill text for the OTHER box
          const autoFillImpression = injectVariables(matchedMacro.impressionText, selectedStudy);
          const autoFillFindings = injectVariables(matchedMacro.findingsText, selectedStudy);

          setSelectedStudy((prev: any) => ({
            ...prev,
            [field]: text, 
            ...(field === 'findings' && !currentImpression && autoFillImpression 
                ? { impression: autoFillImpression } : {}),
            ...(field === 'impression' && !currentFindings && autoFillFindings 
                ? { findings: autoFillFindings } : {})
          }));

          toast.success(`Expanded Macro: ${matchedMacro.title}`);
          return; 
        }
      }
    }
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

  // ==========================================
  // 🟢 UI RENDERING
  // ==========================================

  if (isQueueLoading) {
    return (
      <div className="h-[calc(100vh-4rem)] flex flex-col items-center justify-center bg-muted/30 font-sans">
        <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
        <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest animate-pulse">
          Loading Reporting Desk...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-muted/30 font-sans relative selection:bg-indigo-100 pb-12 lg:h-[calc(100vh-4rem)] lg:overflow-hidden flex flex-col">
      <div className="absolute top-0 inset-x-0 h-64 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-100/40 via-slate-50 to-transparent pointer-events-none z-0" />

      <header className="shrink-0 z-30 px-4 sm:px-6 lg:px-8 py-4 w-full max-w-[1600px] mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card/70 backdrop-blur-xl p-4 rounded-2xl border border-slate-200/60 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-gradient-to-br from-indigo-500 to-primary rounded-xl flex items-center justify-center shadow-inner shrink-0">
              <Stethoscope className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground tracking-tight leading-tight">Radiologist Reporting Desk</h1>
              <p className="text-xs font-medium text-muted-foreground mt-0.5">Review scans, dictate findings, and verify reports.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-4 py-2.5 bg-indigo-50 rounded-xl border border-indigo-100 shadow-sm shrink-0 w-full md:w-auto justify-center">
            <Zap className="h-4 w-4 text-primary" />
            <span className="text-xs font-bold text-indigo-800 uppercase tracking-wider">{macros?.length || 0} Macros Active</span>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-[1920px] mx-auto px-2 sm:px-4 lg:px-6 pb-4 flex flex-col lg:flex-row gap-4 relative z-10 lg:h-[calc(100vh-5rem)] overflow-y-auto lg:overflow-hidden">
        
        {/* COLUMN 1: PATIENT QUEUE */}
        <div className="w-full lg:w-[280px] xl:w-[300px] 2xl:w-[320px] flex flex-col bg-card rounded-xl border border-border shadow-sm overflow-hidden shrink-0 h-[400px] lg:h-full">
          <div className="p-3 border-b border-slate-100 bg-slate-50/50 space-y-3 shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search patient..."
                className="pl-9 bg-card border-border focus:border-indigo-300 focus:ring-primary/20 rounded-lg h-9 text-sm shadow-sm"
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
                    activeFilter === filter ? "bg-card text-primary shadow-sm border border-slate-200/50" : "text-muted-foreground hover:text-slate-800"
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
                <p className="text-sm font-bold text-muted-foreground">Queue is clear</p>
              </div>
            ) : (
              filteredQueue.map((item: any) => {
                const isSelected = selectedStudy?.studyId === item.studyId;
                return (
                  <div key={item.id} onClick={() => setSelectedStudy(item)} className={`p-3 cursor-pointer transition-all border-l-4 group ${isSelected ? "bg-indigo-50/50 border-l-indigo-600" : item.status === "DRAFT" ? "border-l-amber-400 hover:bg-muted/50/80" : "border-l-transparent hover:bg-muted/50/80"}`}>
                    <div className="flex justify-between items-start mb-1 gap-2">
                      <h3 className={`font-bold text-sm truncate ${isSelected ? "text-indigo-900" : "text-foreground"}`}>{item.patient || "Unknown Patient"}</h3>
                      {item.priority === "URGENT" && <div className="h-2 w-2 rounded-full bg-rose-500 animate-pulse mt-1 shrink-0" />}
                    </div>
                    <p className="text-xs font-medium text-muted-foreground mb-2 truncate" title={item.scan}>{item.scan}</p>
                    <div className="flex justify-between items-center mt-2 flex-wrap gap-2">
                      <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-wider bg-card border-border text-foreground/80 shadow-sm">{item.modality}</Badge>
                      <span className="text-[10px] font-medium text-muted-foreground">{item.time}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {selectedStudy ? (
          <>
            {/* COLUMN 2: CLINICAL CONTEXT */}
            <div className="w-full lg:w-[300px] xl:w-[350px] 2xl:w-[400px] flex flex-col gap-4 overflow-y-auto custom-scrollbar shrink-0 h-auto lg:h-full pb-4 lg:pb-10 pr-1 lg:pr-2">
              <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden shrink-0">
                <div className="bg-slate-900 px-3 py-2 flex items-center gap-2 text-primary-foreground">
                  <User className="h-4 w-4 text-indigo-400" />
                  <h3 className="font-bold text-[11px] uppercase tracking-wider">Patient Info</h3>
                </div>
                <div className="p-3 space-y-2.5">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                    <span className="text-[11px] text-muted-foreground font-medium">Name</span>
                    <span className="text-xs font-bold text-foreground">{selectedStudy.patient || "Not available"}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                    <span className="text-[11px] text-muted-foreground font-medium">Age / Gender</span>
                    <span className="text-xs font-semibold text-slate-700">{selectedStudy.age || "N/A"} / {selectedStudy.gender || "N/A"}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                    <span className="text-[11px] text-muted-foreground font-medium">UHID</span>
                    <span className="text-xs font-mono text-slate-700">{selectedStudy.uhid || "N/A"}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                    <span className="text-[11px] text-muted-foreground font-medium">Ref Doctor</span>
                    <span className="text-xs font-semibold text-primary truncate max-w-[120px] text-right">{selectedStudy.referringDoctor || "N/A"}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] text-muted-foreground font-medium">Priority</span>
                    <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded flex items-center gap-1 border border-rose-100">
                      <div className="h-1.5 w-1.5 rounded-full bg-rose-500" /> {selectedStudy.priority || "URGENT"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden shrink-0">
                <div className="bg-amber-50 px-3 py-2 flex items-center gap-2 border-b border-amber-100">
                  <History className="h-4 w-4 text-amber-600" />
                  <h3 className="font-bold text-[11px] uppercase tracking-wider text-amber-900">Clinical History</h3>
                </div>
                <div className="p-3 space-y-4">
                  <div>
                    <h4 className="text-[9px] font-bold text-muted-foreground/70 uppercase tracking-wider mb-1">Chief Complaint</h4>
                    <p className="text-xs font-semibold text-foreground bg-muted/30 p-2 rounded border border-slate-100">{selectedStudy.complaint || "Severe headache for 2 months"}</p>
                  </div>
                </div>
              </div>

              <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden shrink-0">
                <div className="bg-muted/30 px-3 py-2 flex items-center gap-2 border-b border-slate-100">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <h3 className="font-bold text-[11px] uppercase tracking-wider text-slate-700">Previous Studies</h3>
                </div>
                <div className="divide-y divide-slate-100">
                  {isContextLoading ? (
                    <div className="p-4 text-center text-xs text-slate-400">Loading history...</div>
                  ) : patientContext?.previousStudies?.length === 0 ? (
                    <div className="p-4 text-center text-xs font-medium text-muted-foreground">No previous scans found.</div>
                  ) : (
                    patientContext?.previousStudies?.map((study: any) => (
                      <div key={study.id} className="p-2.5 flex items-center justify-between hover:bg-muted/30 transition-colors">
                        <div>
                          <p className="text-xs font-bold text-slate-800">{study.name}</p>
                          <p className="text-[10px] text-muted-foreground">{study.date}</p>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => window.open(`http://localhost:8042/viewer?StudyInstanceUID=${study.uid}`, "_blank")}
                          className="h-6 px-2 text-[9px] font-bold border-indigo-200 text-primary hover:bg-indigo-50">
                          Compare
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden shrink-0">
                <div className="bg-indigo-50 px-3 py-2 flex items-center gap-2 border-b border-indigo-100">
                  <TestTube className="h-4 w-4 text-primary" />
                  <h3 className="font-bold text-[11px] uppercase tracking-wider text-indigo-900">Recent Lab Results</h3>
                </div>
                {isContextLoading ? (
                  <div className="p-4 text-center text-xs text-slate-400">Loading labs...</div>
                ) : !patientContext?.recentLabs ? (
                  <div className="p-4 text-center text-xs font-medium text-muted-foreground">No recent bloodwork found.</div>
                ) : (
                  <div className="p-3 grid grid-cols-2 gap-2">
                    <div className="flex justify-between items-center p-2 bg-muted/30 rounded border border-slate-100">
                      <span className="text-[10px] font-bold text-muted-foreground">Hb</span>
                      <span className="text-xs font-black text-rose-600">{patientContext.recentLabs.hb}</span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-muted/30 rounded border border-slate-100">
                      <span className="text-[10px] font-bold text-muted-foreground">WBC</span>
                      <span className="text-xs font-black text-slate-800">{patientContext.recentLabs.wbc}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* COLUMN 3: REPORT EDITOR */}
            <div className="flex-1 flex flex-col bg-card rounded-xl border border-border shadow-sm overflow-hidden relative min-h-[600px] lg:min-h-0 lg:h-full w-full">
              <div className="px-3 py-2.5 border-b border-slate-100 bg-slate-50/80 shrink-0 flex flex-wrap justify-between items-center gap-2">
                <div className="flex items-center gap-2">
                  <Wand2 className="h-4 w-4 text-primary hidden sm:block" />
                  <span className="text-sm font-bold text-slate-800">Editor</span>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Select onValueChange={handleApplyMacro}>
                    <SelectTrigger className="flex-1 sm:w-[200px] xl:w-[220px] h-8 bg-card border-border text-xs shadow-sm">
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
                    className="h-8 bg-slate-900 hover:bg-slate-800 text-primary-foreground text-xs font-bold rounded-lg shadow-sm shrink-0">
                    <MonitorPlay className="h-3 w-3 sm:mr-1.5" /> <span className="hidden sm:inline">View DICOM</span>
                  </Button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-3 sm:p-5 flex flex-col gap-4">
                <div className="space-y-1.5 flex-1 flex flex-col">
                  <label className="text-xs font-bold text-foreground/80 flex flex-wrap items-center justify-between gap-2">
                    <span>Technique & Findings</span>
                    <span className="text-[9px] font-normal text-muted-foreground/70 bg-muted px-1.5 py-0.5 rounded border border-border">
                      Type <kbd className="font-mono text-muted-foreground">/shortcode</kbd> + Space
                    </span>
                  </label>
                  <Textarea 
                    placeholder="Describe findings or type a /shortcut..." 
                    className="flex-1 min-h-[250px] font-sans text-sm leading-relaxed bg-slate-50/50 border-border focus-visible:ring-primary p-4 shadow-inner resize-none"
                    value={selectedStudy?.findings || ""}
                    onChange={(e) => handleSmartText('findings', e.target.value)}
                  />
                </div>

                <div className="space-y-1.5 h-[150px] xl:h-[200px] flex flex-col shrink-0">
                  <label className="text-xs font-bold text-foreground/80 flex items-center gap-1.5">
                    <AlertCircle className="h-3.5 w-3.5 text-primary" />
                    Impression / Conclusion
                  </label>
                  <Textarea 
                    placeholder="Final diagnosis or type a /shortcut..." 
                    className="flex-1 font-sans text-sm font-semibold leading-relaxed bg-slate-50/50 border-border focus-visible:ring-primary p-4 shadow-inner resize-none"
                    value={selectedStudy?.impression || ""}
                    onChange={(e) => handleSmartText('impression', e.target.value)}
                  />
                </div>
              </div>

              {/* ✅ FIX 2: Added onClick handlers to these buttons */}
              <div className="p-3 border-t border-slate-100 bg-muted/30 flex justify-between items-center shrink-0">
                <Button 
                  variant="outline" 
                  onClick={() => handleAction("DRAFT")}
                  disabled={saveMutation.isPending}
                  className="h-9 text-xs font-bold text-muted-foreground bg-card border-border shadow-sm">
                  <Save className="h-3 w-3 mr-2 text-slate-400" /> Save Draft
                </Button>
                <Button 
                  onClick={() => handleAction("FINALIZE")}
                  disabled={saveMutation.isPending}
                  className="h-9 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm px-6">
                  {saveMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileSignature className="h-3 w-3 mr-2" />}
                  Verify & Sign
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground/70 p-8 bg-card rounded-xl border border-border shadow-sm">
            <div className="h-20 w-20 bg-muted/30 rounded-full flex items-center justify-center shadow-sm mb-4 border border-slate-100">
              <Stethoscope className="h-8 w-8 text-indigo-300" />
            </div>
            <h3 className="text-lg font-bold text-foreground/80 mb-1">Ready to Report</h3>
            <p className="text-xs text-center max-w-sm leading-relaxed text-muted-foreground">
              Select a patient from the queue to begin reporting.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}