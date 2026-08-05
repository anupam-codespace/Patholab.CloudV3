"use client";

import { useState } from "react";
import { 
  HardDrive, Server, Search, Filter, LayoutGrid, List, CheckCircle2, 
  AlertTriangle, Clock, Upload, Download, Eye, FileText, Archive, 
  Brain, Activity, Database, Cpu, MemoryStick, ChevronRight, X, Sparkles, Send
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";

interface StudyItem {
  id: string;
  patient: string;
  patientName?: string;
  uhid?: string;
  study: string;
  accession?: string;
  modality?: string;
  status?: string;
  images?: number;
  size?: string;
  date: string;
  studyDate?: string;
  ai?: string;
}



const ACTIVITIES = [
  { time: "16:05", event: "USG Whole Abdomen uploaded", type: "upload" },
  { time: "15:30", event: "MRI Brain report verified", type: "success" },
  { time: "14:00", event: "Daily Orthanc Backup complete", type: "system" },
  { time: "12:15", event: "Storage cleanup (Freed 45GB)", type: "system" },
];

export default function PacsDashboard() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [selectedStudy, setSelectedStudy] = useState<StudyItem | null>(null);

  // 1. THE REAL-TIME ENGINE
  const { data: liveStudies = [], isLoading } = useQuery<StudyItem[]>({
    queryKey: ["pacs-studies"],
    queryFn: async () => {
      const res = await fetch("/api/workspace/pacs");
      if (!res.ok) throw new Error("Failed to fetch studies");
      return res.json();
    },
    // MAGIC FEATURE: Poll the database every 5 seconds
    refetchInterval: 5000, 
    refetchOnWindowFocus: true, // Auto-update when the doctor switches back to this tab
  });

  // 2. Map data for the UI and apply filters
  const filteredStudies = liveStudies.filter((s) => {
    // Note: Adjust 'patientName' / 'accession' based on your exact Prisma schema fields
    const matchesSearch = 
      s.patientName?.toLowerCase().includes(searchQuery.toLowerCase()) || 
      s.accession?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.uhid?.toLowerCase().includes(searchQuery.toLowerCase());
      
    const matchesFilter = 
      activeFilter === "All" || 
      s.modality === activeFilter || 
      s.status === activeFilter.toUpperCase();

    return matchesSearch && matchesFilter;
  });

  // 3. Dynamic KPIs based on real-time data
  const todaysUploads = liveStudies.filter((s) => {
      const today = new Date().toDateString();
      return s.studyDate ? new Date(s.studyDate).toDateString() === today : false;
  }).length;
  
  const pendingReports = liveStudies.filter((s) => s.status === "AWAITING").length;

  // 7. Status Chips Helper
  const getStatusChip = (status: string) => {
    switch(status) {
      case "REPORTED": return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200"><CheckCircle2 className="w-3 h-3 mr-1"/> Reported</Badge>;
      case "AWAITING": return <Badge className="bg-amber-100 text-amber-800 border-amber-200"><Clock className="w-3 h-3 mr-1"/> Awaiting Report</Badge>;
      case "UPLOADING": return <Badge className="bg-blue-100 text-blue-800 border-primary/20 animate-pulse"><Upload className="w-3 h-3 mr-1"/> Uploading</Badge>;
      case "PROCESSING": return <Badge className="bg-purple-100 text-purple-800 border-purple-200"><Activity className="w-3 h-3 mr-1 animate-spin"/> Processing</Badge>;
      case "ARCHIVED": return <Badge className="bg-slate-200 text-foreground/80 border-slate-300"><Archive className="w-3 h-3 mr-1"/> Archived</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-muted/30 overflow-hidden relative">
      
      {/* ========================================== */}
      {/* MAIN CONTENT (Left Side)                   */}
      {/* ========================================== */}
      <main className="flex-1 flex flex-col overflow-y-auto p-4 lg:p-6 custom-scrollbar">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-black text-foreground tracking-tight">PACS & Imaging</h1>
            <p className="text-sm font-medium text-muted-foreground mt-1">Manage DICOM studies, storage, and Orthanc servers.</p>
          </div>
          <div className="flex gap-2">
            {/* 14. Bulk Actions (Mocked for UI) */}
            <Button variant="outline" className="bg-card border-border text-muted-foreground shadow-sm hidden sm:flex">
              <Archive className="w-4 h-4 mr-2" /> Bulk Archive
            </Button>
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-sm">
              <Upload className="w-4 h-4 mr-2" /> Upload DICOM
            </Button>
          </div>
        </div>

        {/* 1. KPI CARDS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 shrink-0">
          {[
            { label: "Total Studies", value: liveStudies.length, icon: Brain, color: "text-primary" },
            { label: "Today's Uploads", value: todaysUploads, icon: Upload, color: "text-primary" },
            { label: "Pending Reports", value: pendingReports, icon: Clock, color: "text-amber-600" },
            { label: "Storage Used", value: "6.4 TB", sub: "/ 10 TB", icon: HardDrive, color: "text-rose-600" },
          ].map((kpi, idx) => (
            <div key={idx} className="bg-card p-4 rounded-xl border border-border shadow-sm flex flex-col justify-center">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
                <span className="text-xs font-bold uppercase tracking-wider">{kpi.label}</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-foreground">{kpi.value}</span>
                {kpi.sub && <span className="text-xs font-bold text-slate-400">{kpi.sub}</span>}
              </div>
            </div>
          ))}
        </div>

        {/* 3 & 4. FILTERS & ADVANCED SEARCH */}
        <div className="bg-card p-3 rounded-xl border border-border shadow-sm flex flex-col lg:flex-row justify-between items-center gap-4 mb-6 shrink-0">
          <div className="flex flex-wrap items-center gap-1.5 w-full lg:w-auto">
            {["All", "MRI", "CT", "X-Ray", "USG", "Reported", "Awaiting"].map((f) => (
              <button 
                key={f} onClick={() => setActiveFilter(f)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  activeFilter === f ? "bg-indigo-50 text-primary border border-indigo-200" : "text-muted-foreground hover:bg-muted border border-transparent"
                }`}>
                {f}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3 w-full lg:w-auto">
            <div className="relative flex-1 lg:w-80">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <Input placeholder="Search patient, accession, UHID..." className="pl-9 h-9 bg-muted/30 text-sm border-border" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
            {/* 18. View Toggle */}
            <div className="flex bg-muted p-1 rounded-lg border border-border shrink-0">
              <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-md ${viewMode === 'grid' ? 'bg-card shadow-sm text-primary' : 'text-slate-400'}`}><LayoutGrid className="w-4 h-4" /></button>
              <button onClick={() => setViewMode('table')} className={`p-1.5 rounded-md ${viewMode === 'table' ? 'bg-card shadow-sm text-primary' : 'text-slate-400'}`}><List className="w-4 h-4" /></button>
            </div>
          </div>
        </div>

        {/* 6. RICH TABLE OR GRID VIEW */}
        <div className="flex-1 bg-card rounded-xl border border-border shadow-sm overflow-hidden flex flex-col min-h-[400px]">
          {filteredStudies.length === 0 ? (
            // 17. Better Empty State
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground/70 p-8">
              <div className="h-16 w-16 bg-muted/30 rounded-2xl flex items-center justify-center border border-slate-100 mb-4 shadow-sm">
                <Upload className="w-8 h-8 text-indigo-300" />
              </div>
              <h3 className="text-lg font-bold text-slate-700">No studies found</h3>
              <p className="text-sm text-muted-foreground mt-1 mb-4">Drag a DICOM folder here or sync with Orthanc.</p>
              <Button variant="outline" className="border-indigo-200 text-primary bg-indigo-50 hover:bg-indigo-100">Connect PACS</Button>
            </div>
          ) : viewMode === 'table' ? (
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-muted/30 border-b border-border text-muted-foreground">
                  <tr>
                    <th className="p-4 font-bold text-xs uppercase tracking-wider">Patient & Study</th>
                    <th className="p-4 font-bold text-xs uppercase tracking-wider">Details</th>
                    <th className="p-4 font-bold text-xs uppercase tracking-wider">Images & Size</th>
                    <th className="p-4 font-bold text-xs uppercase tracking-wider">Status</th>
                    <th className="p-4 font-bold text-xs uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStudies.map(study => (
                    <tr key={study.id} onClick={() => setSelectedStudy(study)} className={`hover:bg-indigo-50/50 cursor-pointer transition-colors ${selectedStudy?.id === study.id ? 'bg-indigo-50/80' : ''}`}>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          {/* 5. Thumbnail Preview */}
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border ${
                            study.modality === 'MRI' ? 'bg-indigo-100 border-indigo-200 text-primary' :
                            study.modality === 'CT' ? 'bg-purple-100 border-purple-200 text-purple-700' : 'bg-blue-100 border-primary/20 text-primary'
                          }`}>
                            <Brain className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-bold text-foreground">{study.patient} <span className="text-xs font-mono text-muted-foreground/70 ml-2">{study.uhid}</span></p>
                            <p className="text-xs font-medium text-muted-foreground truncate max-w-[200px]">{study.study}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <p className="font-bold text-foreground/80 text-xs">{study.modality}</p>
                        <p className="text-[10px] font-mono text-muted-foreground mt-0.5">{study.accession}</p>
                      </td>
                      <td className="p-4">
                        {/* 11. Image Count */}
                        <p className="font-bold text-foreground/80 text-xs">{study.images} Images</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{study.size}</p>
                      </td>
                      <td className="p-4">{getStatusChip(study.status ?? "")}</td>
                      <td className="p-4 text-right">
                        {/* 19. Actions */}
                        <div className="flex items-center justify-end gap-2">
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-primary hover:bg-indigo-100" title="Open Viewer"><Eye className="w-4 h-4"/></Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground/70 hover:text-muted-foreground" title="Download"><Download className="w-4 h-4"/></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 overflow-y-auto">
              {filteredStudies.map(study => (
                <div key={study.id} onClick={() => setSelectedStudy(study)} className={`p-4 rounded-xl border cursor-pointer transition-all ${selectedStudy?.id === study.id ? 'border-indigo-500 ring-1 ring-primary shadow-md bg-indigo-50/20' : 'border-border hover:border-indigo-300 hover:shadow-sm'}`}>
                  <div className="flex justify-between items-start mb-3">
                    <Badge variant="outline" className="bg-muted/30 font-bold">{study.modality}</Badge>
                    {getStatusChip(study.status ?? "")}
                  </div>
                  <h3 className="font-bold text-foreground">{study.patient}</h3>
                  <p className="text-xs text-muted-foreground mb-3 truncate">{study.study}</p>
                  <div className="flex justify-between items-center text-xs font-bold text-muted-foreground/70 pt-3 border-t border-slate-100">
                    <span>{study.images} Img</span>
                    <span>{study.date.split(',')[0]}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* ========================================== */}
      {/* RIGHT SIDEBAR (Dual Mode: System vs Study) */}
      {/* ========================================== */}
      <aside className={`w-[320px] 2xl:w-[380px] border-l border-border bg-card flex flex-col shrink-0 transition-transform duration-300 ${selectedStudy ? 'translate-x-0 absolute right-0 h-full z-20 shadow-2xl lg:relative lg:shadow-none' : 'hidden lg:flex'}`}>
        
        {selectedStudy ? (
          // ------------------------------------------------
          // MODE 1: STUDY PREVIEW DRAWER (Point 10 & 13)
          // ------------------------------------------------
          <div className="flex flex-col h-full overflow-y-auto custom-scrollbar">
            <div className="p-4 bg-slate-900 text-primary-foreground flex justify-between items-center sticky top-0 z-10">
              <h2 className="font-bold text-sm flex items-center gap-2"><Eye className="w-4 h-4 text-indigo-400"/> Study Preview</h2>
              <button onClick={() => setSelectedStudy(null)} className="p-1 hover:bg-card/10 rounded-md"><X className="w-4 h-4"/></button>
            </div>
            
            <div className="p-5 flex flex-col gap-6">
              <div className="text-center">
                <div className="w-20 h-20 mx-auto bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center justify-center mb-3 shadow-inner">
                  <Brain className="w-10 h-10 text-primary" />
                </div>
                <h3 className="font-black text-lg text-foreground">{selectedStudy.patient}</h3>
                <p className="text-xs font-bold text-muted-foreground font-mono mt-1">{selectedStudy.uhid}</p>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2">
                <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold shadow-sm h-9">
                  <Eye className="w-3.5 h-3.5 mr-1.5"/> Open Viewer
                </Button>
                <Button variant="outline" className="w-full text-xs font-bold shadow-sm h-9">
                  <FileText className="w-3.5 h-3.5 mr-1.5"/> Report
                </Button>
                <Button variant="outline" className="w-full text-xs font-bold shadow-sm h-9 col-span-2 text-muted-foreground">
                  <Download className="w-3.5 h-3.5 mr-1.5"/> Download DICOM Zip
                </Button>
              </div>

              {/* Study Details */}
              <div className="bg-muted/30 p-4 rounded-xl border border-slate-100 space-y-3">
                <div className="flex justify-between">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Study Name</span>
                  <span className="text-xs font-bold text-foreground text-right">{selectedStudy.study}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Accession</span>
                  <span className="text-xs font-bold text-foreground font-mono">{selectedStudy.accession}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Date</span>
                  <span className="text-xs font-bold text-slate-800">{selectedStudy.date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Images</span>
                  <span className="text-xs font-bold text-primary">{selectedStudy.images} ({selectedStudy.size})</span>
                </div>
              </div>

              {/* 13. AI Insights */}
              {selectedStudy.ai && (
                <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-purple-600" />
                    <span className="text-xs font-black uppercase tracking-wider text-purple-900">AI Insight</span>
                  </div>
                  <p className="text-xs font-semibold text-purple-800 leading-relaxed">{selectedStudy.ai}</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          // ------------------------------------------------
          // MODE 2: SYSTEM OVERVIEW (Points 2, 8, 9, 15, 16)
          // ------------------------------------------------
          <div className="flex flex-col h-full overflow-y-auto custom-scrollbar p-5 gap-6">
            
            {/* 9. PACS Health */}
            <div>
              <h3 className="text-[11px] font-black uppercase tracking-wider text-muted-foreground/70 mb-3 flex items-center gap-2">
                <Server className="w-3.5 h-3.5"/> Server Health
              </h3>
              <div className="bg-card border border-border rounded-xl shadow-sm p-1 divide-y divide-slate-100">
                <div className="flex justify-between items-center p-2.5">
                  <span className="text-xs font-bold text-slate-700">Orthanc Node</span>
                  <span className="flex items-center gap-1.5 text-[10px] font-bold text-primary bg-emerald-50 px-2 py-1 rounded-md"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"/> ONLINE</span>
                </div>
                <div className="flex justify-between items-center p-2.5">
                  <span className="text-xs font-bold text-slate-700">DICOM Listener</span>
                  <span className="flex items-center gap-1.5 text-[10px] font-bold text-primary bg-emerald-50 px-2 py-1 rounded-md"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500"/> RUNNING</span>
                </div>
                <div className="flex justify-between items-center p-2.5">
                  <span className="text-xs font-bold text-slate-700">PostgreSQL DB</span>
                  <span className="flex items-center gap-1.5 text-[10px] font-bold text-primary bg-emerald-50 px-2 py-1 rounded-md"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500"/> HEALTHY</span>
                </div>
              </div>
            </div>

            {/* 16. Server Monitoring */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-muted/30 border border-slate-100 p-3 rounded-xl">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] font-bold text-muted-foreground/70 uppercase">CPU Load</span>
                  <Cpu className="w-3.5 h-3.5 text-slate-400"/>
                </div>
                <span className="text-lg font-black text-slate-700">22%</span>
              </div>
              <div className="bg-muted/30 border border-slate-100 p-3 rounded-xl">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] font-bold text-muted-foreground/70 uppercase">RAM Usage</span>
                  <MemoryStick className="w-3.5 h-3.5 text-slate-400"/>
                </div>
                <span className="text-lg font-black text-amber-600">41%</span>
              </div>
            </div>

            {/* 2 & 15. Better Storage Card & Analytics */}
            <div>
              <h3 className="text-[11px] font-black uppercase tracking-wider text-muted-foreground/70 mb-3 flex items-center gap-2">
                <Database className="w-3.5 h-3.5"/> Storage Matrix
              </h3>
              <div className="bg-card border border-border rounded-xl shadow-sm p-4">
                <div className="flex justify-between items-end mb-2">
                  <span className="font-bold text-foreground text-sm">Main NAS</span>
                  <div className="text-right">
                    <span className="font-black text-rose-600">6.4 TB</span>
                    <span className="text-[10px] font-bold text-muted-foreground/70 ml-1">/ 10 TB</span>
                  </div>
                </div>
                <div className="w-full bg-muted rounded-full h-2 mb-4 overflow-hidden">
                  <div className="bg-rose-500 h-full rounded-full w-[64%]"></div>
                </div>
                
                {/* Modality Breakdown */}
                <div className="space-y-2 mt-4 pt-4 border-t border-slate-100">
                  {[
                    { mod: "MRI", val: "4.2 TB", pct: "65%", col: "bg-indigo-500" },
                    { mod: "CT", val: "1.5 TB", pct: "25%", col: "bg-purple-500" },
                    { mod: "USG", val: "0.7 TB", pct: "10%", col: "bg-primary/100" }
                  ].map((st, i) => (
                    <div key={i} className="flex justify-between items-center text-xs">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${st.col}`}></div>
                        <span className="font-bold text-muted-foreground">{st.mod}</span>
                      </div>
                      <span className="font-mono font-bold text-muted-foreground">{st.val}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 20. Activity Feed */}
            <div className="flex-1 min-h-[200px]">
              <h3 className="text-[11px] font-black uppercase tracking-wider text-muted-foreground/70 mb-3 flex items-center gap-2">
                <Activity className="w-3.5 h-3.5"/> Live Activity
              </h3>
              <div className="space-y-4 relative before:absolute before:inset-0 before:ml-2.5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
                {ACTIVITIES.map((act, i) => (
                  <div key={i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className={`flex items-center justify-center w-5 h-5 rounded-full border-2 border-white bg-slate-200 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm ${act.type==='upload' ? 'bg-blue-400' : act.type === 'success' ? 'bg-emerald-400' : 'bg-slate-400'} z-10`}></div>
                    <div className="w-[calc(100%-2rem)] md:w-[calc(50%-1.5rem)] bg-card p-2.5 rounded-lg border border-slate-100 shadow-sm ml-2 md:ml-0">
                      <div className="flex justify-between items-center mb-1">
                        <time className="text-[9px] font-bold font-mono text-slate-400">{act.time}</time>
                      </div>
                      <p className="text-xs font-semibold text-foreground/80 leading-tight">{act.event}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}
      </aside>

    </div>
  );
}