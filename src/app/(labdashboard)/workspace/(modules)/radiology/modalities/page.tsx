"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Activity, Settings, Edit, FileText, Wrench, ShieldCheck, 
  Server, Wifi, Monitor, ActivitySquare, Plus, Search, 
  LayoutGrid, List, AlertTriangle, PowerOff
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";



export default function MachinesDashboard() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("ALL");

  // Action Modals State
  const [activeModal, setActiveModal] = useState<string | null>(null); // 'view' | 'edit' | 'logs' | 'config'
  const [selectedMachine, setSelectedMachine] = useState<any>(null);

  const openAction = (type: string, machine: any) => {
    setSelectedMachine(machine);
    setActiveModal(type);
  };

 // 1. Fetch live Modalities from your API
  const { data: modalities = [], isLoading } = useQuery({
    queryKey: ["radiology-modalities"],
    queryFn: async () => {
      const res = await fetch("/api/workspace/radiology/modalities"); 
      if (!res.ok) throw new Error("Failed to fetch modalities");
      return res.json();
    }
  });

  // 3. NEW: Calculate Live KPIs from the database data
  const totalMachines = modalities.length;
  const activeMachines = modalities.filter((m: any) => m.status === "ACTIVE").length;
  const maintenanceMachines = modalities.filter((m: any) => m.status === "MAINTENANCE").length;
  const offlineMachines = modalities.filter((m: any) => m.status === "OFFLINE").length;
  
  // Note: Utilization usually requires calculating the total daily scans vs max slots. 
  // Until we link this to the appointments table, we can show a placeholder or calculate if you add it to the schema later.
  const avgUtilization = totalMachines > 0 ? "~82%" : "0%";

  // 2. Filter Logic (Applies your search and button filters)
  const filteredModalities = modalities.filter((machine: any) => {
    const matchesSearch = 
      machine.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
      machine.aeTitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      machine.ipAddress?.includes(searchQuery);

    const matchesFilter = activeFilter === "ALL" || 
      (activeFilter === "Active" && machine.status === "ACTIVE") ||
      (activeFilter === "Maintenance" && machine.status === "MAINTENANCE") ||
      machine.type === activeFilter;

      

    return matchesSearch && matchesFilter;
  });

  

  // Helper for Status Badges
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE": return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-emerald-200 shadow-sm"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse" /> Active</Badge>;
      case "BUSY": return <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100 border-purple-200 shadow-sm"><span className="w-1.5 h-1.5 rounded-full bg-purple-500 mr-1.5 animate-pulse" /> Busy</Badge>;
      case "MAINTENANCE": return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-200 shadow-sm"><Wrench className="w-3 h-3 mr-1" /> Service</Badge>;
      case "OFFLINE": return <Badge className="bg-rose-100 text-rose-800 hover:bg-rose-100 border-rose-200 shadow-sm"><PowerOff className="w-3 h-3 mr-1" /> Offline</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-slate-50 p-4 lg:p-8 overflow-y-auto">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Modalities & Assets</h1>
          <p className="text-sm font-medium text-slate-500 mt-1">Manage machine health, DICOM connectivity, and utilization.</p>
        </div>
        <Button className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-sm">
          <Plus className="w-4 h-4 mr-2" /> Add Machine
        </Button>
      </div>

      {/* 1. KPI CARDS (Now Live!) */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 lg:gap-4 mb-6">
        {[
          { label: "Total Machines", value: totalMachines, icon: ActivitySquare, color: "text-slate-600" },
          { label: "Active", value: activeMachines, icon: Activity, color: "text-emerald-600" },
          { label: "Maintenance", value: maintenanceMachines, icon: AlertTriangle, color: "text-amber-600" },
          { label: "Offline", value: offlineMachines, icon: PowerOff, color: "text-rose-600" },
          { label: "Avg Utilization", value: avgUtilization, icon: ActivitySquare, color: "text-indigo-600" },
        ].map((kpi, idx) => (
          <div key={idx} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center">
            <div className="flex items-center gap-2 text-slate-500 mb-2">
              <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
              <span className="text-xs font-bold uppercase tracking-wider">{kpi.label}</span>
            </div>
            <span className="text-2xl font-black text-slate-900">
              {isLoading ? "-" : kpi.value}
            </span>
          </div>
        ))}
      </div>

      {/* 8. FILTER BAR */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col lg:flex-row justify-between items-center gap-4 mb-6">
        <div className="flex flex-wrap items-center gap-1.5 w-full lg:w-auto">
          {["All", "MRI", "CT", "X-Ray", "USG", "Active", "Maintenance"].map((f) => (
            <button 
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                activeFilter === f ? "bg-indigo-50 text-indigo-700 border border-indigo-200" : "text-slate-600 hover:bg-slate-100 border border-transparent"
              }`}>
              {f}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 w-full lg:w-auto">
          <div className="relative flex-1 lg:w-64">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <Input placeholder="Search AE Title, IP..." className="pl-9 h-9 bg-slate-50 text-sm" />
          </div>
          <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 shrink-0">
            <button className="p-1.5 bg-white shadow-sm rounded-md text-indigo-600"><LayoutGrid className="w-4 h-4" /></button>
            <button className="p-1.5 text-slate-400 hover:text-slate-600"><List className="w-4 h-4" /></button>
          </div>
        </div>
      </div>

     {/* 2. MACHINE GRID */}
      {isLoading ? (
        <div className="flex items-center justify-center p-20 text-slate-400">Loading modalities...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-5 pb-10">
          {filteredModalities.map((machine: any) => (
            <div key={machine.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow">
              
              {/* Card Header */}
              <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-start">
                <div className="flex gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 shadow-sm border ${
                    machine.type === 'MRI' ? 'bg-indigo-50 border-indigo-100 text-indigo-600' : 
                    machine.type === 'CT' ? 'bg-purple-50 border-purple-100 text-purple-600' : 'bg-blue-50 border-blue-100 text-blue-600'
                  }`}>
                    <Server className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm leading-tight">{machine.name}</h3>
                    <span className="text-xs font-semibold text-slate-500">{machine.location || "Unassigned Room"}</span>
                  </div>
                </div>
                {getStatusBadge(machine.status)}
              </div>

              {/* Content Body */}
              <div className="p-4 flex-1 flex flex-col gap-5">
                
                {/* System Details (Grid) */}
                <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-xs">
                  <div>
                    <p className="text-[10px] uppercase font-bold text-slate-400 mb-0.5">AE Title</p>
                    <p className="font-mono font-bold text-slate-700">{machine.aeTitle || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-slate-400 mb-0.5">IP Address : Port</p>
                    <p className="font-mono font-bold text-slate-700">{machine.ipAddress || "0.0.0.0"} : {machine.port || "104"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-slate-400 mb-0.5">Manufacturer</p>
                    <p className="font-semibold text-slate-700">{machine.manufacturer || "Unknown"}</p>
                  </div>
                </div>

                {/* Maintenance Dates */}
                <div className="flex justify-between items-center text-xs p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                  <div>
                    <p className="text-[9px] uppercase font-bold text-slate-400">Last Service</p>
                    <p className="font-bold text-slate-700">
                      {machine.lastMaintenance ? new Date(machine.lastMaintenance).toLocaleDateString() : "N/A"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] uppercase font-bold text-slate-400">Next Service</p>
                    <p className="font-bold text-amber-600">
                      {machine.nextMaintenance ? new Date(machine.nextMaintenance).toLocaleDateString() : "N/A"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Footer Actions */}
            {/* 6. Quick Actions Footer */}
            <div className="grid grid-cols-4 border-t border-slate-100 bg-slate-50 shrink-0 divide-x divide-slate-200">
              <button onClick={() => openAction('view', machine)} className="flex flex-col items-center justify-center py-2.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors">
                <Monitor className="w-4 h-4 mb-1" />
                <span className="text-[9px] font-bold uppercase tracking-wider">View</span>
              </button>
              <button onClick={() => openAction('edit', machine)} className="flex flex-col items-center justify-center py-2.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors">
                <Edit className="w-4 h-4 mb-1" />
                <span className="text-[9px] font-bold uppercase tracking-wider">Edit</span>
              </button>
              <button onClick={() => openAction('logs', machine)} className="flex flex-col items-center justify-center py-2.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors">
                <FileText className="w-4 h-4 mb-1" />
                <span className="text-[9px] font-bold uppercase tracking-wider">Logs</span>
              </button>
              <button onClick={() => openAction('config', machine)} className="flex flex-col items-center justify-center py-2.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors">
                <Settings className="w-4 h-4 mb-1" />
                <span className="text-[9px] font-bold uppercase tracking-wider">Config</span>
              </button>
            </div>
            </div>
          ))}
        </div>
      )}

      {/* MASTER ACTION MODAL */}
      <Dialog open={!!activeModal} onOpenChange={() => setActiveModal(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="capitalize">{activeModal} Machine: {selectedMachine?.name}</DialogTitle>
          </DialogHeader>

          {activeModal === 'view' && (
            <div className="p-4 bg-slate-50 rounded-lg">
              {/* Detailed View Component */}
              <p>Show full modality specs, warranty info, and system details here.</p>
            </div>
          )}

          {activeModal === 'edit' && (
            <div className="p-4">
              {/* Edit Form Component */}
              <p>Form to edit Name, AE Title, IP, and Status.</p>
            </div>
          )}

          {activeModal === 'logs' && (
            <div className="p-4">
              {/* Audit Logs Table */}
              <p>Fetch audit logs from /api/workspace/audit-logs where entityId = {selectedMachine?.id}</p>
            </div>
          )}
          
          {activeModal === 'config' && (
            <div className="p-4">
              {/* DICOM Node Config */}
              <p>DICOM settings, Port, AE Title configuration fields.</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}