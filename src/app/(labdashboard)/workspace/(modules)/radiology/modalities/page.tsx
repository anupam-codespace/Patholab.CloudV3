"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Activity, Settings, Edit, FileText, Wrench, ShieldCheck, 
  Server, Monitor, ActivitySquare, Plus, Search, 
  LayoutGrid, List, AlertTriangle, PowerOff, Loader2, Trash2, Save
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import toast from "react-hot-toast";

// Helper to format dates for the HTML <input type="date">
const formatDateForInput = (dateString: string | null) => {
  if (!dateString) return "";
  return new Date(dateString).toISOString().split('T')[0];
};

const defaultFormState = {
  name: "", type: "MRI", aeTitle: "", ipAddress: "", port: "", 
  location: "", manufacturer: "", status: "ACTIVE", lastMaintenance: "", nextMaintenance: ""
};

export default function MachinesDashboard() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("ALL");

  // Modal State
  const [activeModal, setActiveModal] = useState<'add' | 'edit' | 'view' | 'delete' | null>(null);
  const [selectedMachine, setSelectedMachine] = useState<any>(null);
  const [formData, setFormData] = useState(defaultFormState);

  // 1. GET: Fetch Modalities
  const { data: modalities = [], isLoading } = useQuery({
    queryKey: ["radiology-modalities"],
    queryFn: async () => {
      const res = await fetch("/api/workspace/radiology/modalities");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch modalities");
      return data; // Your GET route returns the array directly
    }
  });

  // 2. POST: Add Machine
  const addMutation = useMutation({
    mutationFn: async (payload: typeof formData) => {
      const res = await fetch("/api/workspace/radiology/modalities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add machine");
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message || "Machine added!");
      queryClient.invalidateQueries({ queryKey: ["radiology-modalities"] });
      setActiveModal(null);
    },
    onError: (err: any) => toast.error(err.message),
  });

  // 3. PATCH: Edit Machine
  const editMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/workspace/radiology/modalities", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedMachine.id, ...payload }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update machine");
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message || "Machine updated!");
      queryClient.invalidateQueries({ queryKey: ["radiology-modalities"] });
      setActiveModal(null);
    },
    onError: (err: any) => toast.error(err.message),
  });

  // 4. DELETE: Remove Machine
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/workspace/radiology/modalities?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete machine");
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message || "Machine deleted!");
      queryClient.invalidateQueries({ queryKey: ["radiology-modalities"] });
      setActiveModal(null);
    },
    onError: (err: any) => toast.error(err.message), // This will nicely show your P2003 foreign key error!
  });

  // Handle opening modals and populating data
  const openModal = (type: 'add' | 'edit' | 'view' | 'delete', machine: any = null) => {
    setSelectedMachine(machine);
    if (type === 'edit' && machine) {
      setFormData({
        name: machine.name || "",
        type: machine.type || "MRI",
        aeTitle: machine.aeTitle || "",
        ipAddress: machine.ipAddress || "",
        port: machine.port?.toString() || "",
        location: machine.location || "",
        manufacturer: machine.manufacturer || "",
        status: machine.status || "ACTIVE",
        lastMaintenance: formatDateForInput(machine.lastMaintenance),
        nextMaintenance: formatDateForInput(machine.nextMaintenance),
      });
    } else if (type === 'add') {
      setFormData(defaultFormState);
    }
    setActiveModal(type);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeModal === 'add') addMutation.mutate(formData);
    if (activeModal === 'edit') editMutation.mutate(formData);
  };

  // KPIs
  const totalMachines = modalities.length;
  const activeMachines = modalities.filter((m: any) => m.status === "ACTIVE").length;
  const maintenanceMachines = modalities.filter((m: any) => m.status === "MAINTENANCE").length;
  const offlineMachines = modalities.filter((m: any) => m.status === "OFFLINE").length;

  // Filtering
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

  // Status Badge Helper
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE": return <Badge className="bg-emerald-100 text-emerald-800 border-none shadow-sm"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse" /> Active</Badge>;
      case "MAINTENANCE": return <Badge className="bg-amber-100 text-amber-800 border-none shadow-sm"><Wrench className="w-3 h-3 mr-1" /> Service</Badge>;
      case "OFFLINE": return <Badge className="bg-muted text-muted-foreground border-none shadow-sm"><PowerOff className="w-3 h-3 mr-1" /> Offline</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-muted/30 p-4 lg:p-8 overflow-y-auto">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-black text-foreground tracking-tight">Modalities & Assets</h1>
          <p className="text-sm font-medium text-muted-foreground mt-1">Manage machine health, DICOM connectivity, and maintenance schedules.</p>
        </div>
        <Button onClick={() => openModal('add')} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-sm">
          <Plus className="w-4 h-4 mr-2" /> Add Machine
        </Button>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Machines", value: totalMachines, icon: ActivitySquare, color: "text-muted-foreground" },
          { label: "Active", value: activeMachines, icon: Activity, color: "text-emerald-600" },
          { label: "In Maintenance", value: maintenanceMachines, icon: AlertTriangle, color: "text-amber-600" },
          { label: "Offline", value: offlineMachines, icon: PowerOff, color: "text-rose-600" },
        ].map((kpi, idx) => (
          <div key={idx} className="bg-card p-5 rounded-xl border border-border shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">{kpi.label}</p>
              <h3 className="text-2xl font-black text-foreground">{isLoading ? "-" : kpi.value}</h3>
            </div>
            <div className={`h-10 w-10 rounded-full flex items-center justify-center bg-muted/30 border border-slate-100`}>
              <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
            </div>
          </div>
        ))}
      </div>

      {/* FILTER BAR */}
      <div className="bg-card p-3 rounded-xl border border-border shadow-sm flex flex-col lg:flex-row justify-between items-center gap-4 mb-6">
        <div className="flex flex-wrap items-center gap-1.5 w-full lg:w-auto">
          {["ALL", "MRI", "CT", "X-Ray", "USG", "Active", "Maintenance"].map((f) => (
            <button key={f} onClick={() => setActiveFilter(f)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                activeFilter === f ? "bg-indigo-50 text-indigo-700 border border-indigo-200" : "text-muted-foreground hover:bg-muted border border-transparent"
              }`}>
              {f}
            </button>
          ))}
        </div>
        <div className="relative flex-1 lg:max-w-xs w-full">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <Input placeholder="Search AE Title, IP, Name..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 h-9 bg-muted/30 text-sm" />
        </div>
      </div>

     {/* MACHINE GRID */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-20 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin mb-4 text-indigo-500" />
          <p className="font-bold">Loading modalities...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 pb-10">
          {filteredModalities.length === 0 ? (
             <div className="col-span-full p-12 text-center text-muted-foreground bg-card rounded-xl border border-border border-dashed">
                No machines found. Click "Add Machine" to register one.
             </div>
          ) : filteredModalities.map((machine: any) => (
            <div key={machine.id} className="bg-card rounded-xl border border-border shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-all group">
              
              <div className="p-4 border-b border-slate-100 bg-slate-50/80 flex justify-between items-start">
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 shadow-sm bg-card border border-border text-indigo-600">
                    <Server className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground text-sm">{machine.name}</h3>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{machine.manufacturer || "Unknown Brand"} • {machine.type}</span>
                  </div>
                </div>
                {getStatusBadge(machine.status)}
              </div>

              <div className="p-4 flex-1 flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-xs">
                  <div>
                    <p className="text-[10px] uppercase font-bold text-muted-foreground/70 mb-0.5">AE Title</p>
                    <p className="font-mono font-bold text-slate-700">{machine.aeTitle || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-muted-foreground/70 mb-0.5">IP Address : Port</p>
                    <p className="font-mono font-bold text-slate-700">{machine.ipAddress || "0.0.0.0"}:{machine.port || "104"}</p>
                  </div>
                </div>

                <div className="flex justify-between items-center text-xs p-2.5 bg-muted/30 rounded-lg border border-slate-100">
                  <div>
                    <p className="text-[9px] uppercase font-bold text-slate-400">Last Service</p>
                    <p className="font-bold text-slate-700">{machine.lastMaintenance ? new Date(machine.lastMaintenance).toLocaleDateString() : "N/A"}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] uppercase font-bold text-slate-400">Next Service</p>
                    <p className="font-bold text-indigo-600">{machine.nextMaintenance ? new Date(machine.nextMaintenance).toLocaleDateString() : "N/A"}</p>
                  </div>
                </div>
              </div>

              {/* Action Bar */}
              <div className="grid grid-cols-3 border-t border-slate-100 bg-muted/30 shrink-0 divide-x divide-slate-200">
                <button onClick={() => openModal('view', machine)} className="py-2.5 text-muted-foreground hover:text-indigo-600 hover:bg-indigo-50 transition-colors font-bold text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5">
                  <Monitor className="w-3.5 h-3.5" /> View
                </button>
                <button onClick={() => openModal('edit', machine)} className="py-2.5 text-muted-foreground hover:text-indigo-600 hover:bg-indigo-50 transition-colors font-bold text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5">
                  <Settings className="w-3.5 h-3.5" /> Config
                </button>
                <button onClick={() => openModal('delete', machine)} className="py-2.5 text-muted-foreground/70 hover:text-rose-600 hover:bg-rose-50 transition-colors font-bold text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5">
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MASTER FORM MODAL (Handles Add & Edit) */}
      <Dialog open={activeModal === 'add' || activeModal === 'edit'} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {activeModal === 'add' ? 'Register New Machine' : `Edit Machine: ${selectedMachine?.name}`}
            </DialogTitle>
            <DialogDescription>Configure standard details, DICOM networking, and maintenance logs.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6 py-4">
            
            {/* Section 1: Basic Info */}
            <div className="space-y-3">
              <h3 className="text-xs font-black text-muted-foreground/70 uppercase tracking-wider border-b pb-2">Basic Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Machine Name *</label>
                  <Input required placeholder="Main MRI 1.5T" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Modality Type *</label>
                  <select className="w-full h-9 px-3 py-1 text-sm border rounded-md bg-card border-border" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                    <option value="MRI">MRI</option><option value="CT">CT</option><option value="X-RAY">X-Ray</option><option value="USG">USG</option><option value="PET">PET</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Manufacturer</label>
                  <Input placeholder="GE, Siemens, Philips..." value={formData.manufacturer} onChange={e => setFormData({...formData, manufacturer: e.target.value})} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Physical Location / Room</label>
                  <Input placeholder="Room 101" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} />
                </div>
              </div>
            </div>

            {/* Section 2: DICOM Networking */}
            <div className="space-y-3">
              <h3 className="text-xs font-black text-muted-foreground/70 uppercase tracking-wider border-b pb-2">DICOM Connectivity</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">AE Title</label>
                  <Input placeholder="PACS_MRI" value={formData.aeTitle} onChange={e => setFormData({...formData, aeTitle: e.target.value})} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">IP Address</label>
                  <Input placeholder="192.168.1.100" value={formData.ipAddress} onChange={e => setFormData({...formData, ipAddress: e.target.value})} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Port</label>
                  <Input type="number" placeholder="104" value={formData.port} onChange={e => setFormData({...formData, port: e.target.value})} />
                </div>
              </div>
            </div>

            {/* Section 3: Status & Maintenance */}
            <div className="space-y-3">
              <h3 className="text-xs font-black text-muted-foreground/70 uppercase tracking-wider border-b pb-2">Health & Maintenance</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Current Status</label>
                  <select className="w-full h-9 px-3 py-1 text-sm border rounded-md bg-card border-border font-semibold text-slate-700" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                    <option value="ACTIVE">✅ Active</option>
                    <option value="MAINTENANCE">🔧 In Maintenance</option>
                    <option value="OFFLINE">❌ Offline / Inactive</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Last Serviced</label>
                  <Input type="date" value={formData.lastMaintenance} onChange={e => setFormData({...formData, lastMaintenance: e.target.value})} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Next Service Due</label>
                  <Input type="date" value={formData.nextMaintenance} onChange={e => setFormData({...formData, nextMaintenance: e.target.value})} />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-4 flex justify-end gap-3 border-t">
              <Button type="button" variant="outline" onClick={() => setActiveModal(null)}>Cancel</Button>
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold" disabled={addMutation.isPending || editMutation.isPending}>
                {(addMutation.isPending || editMutation.isPending) ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                {activeModal === 'add' ? "Register Machine" : "Save Changes"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRMATION MODAL */}
      <Dialog open={activeModal === 'delete'} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent className="max-w-md text-center p-8">
          <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <DialogTitle className="text-xl font-bold text-foreground mb-2">Delete Machine?</DialogTitle>
          <DialogDescription className="text-muted-foreground mb-6">
            Are you sure you want to permanently remove <strong>{selectedMachine?.name}</strong>? This action cannot be undone.
          </DialogDescription>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => setActiveModal(null)} className="w-full">Cancel</Button>
            <Button variant="destructive" onClick={() => deleteMutation.mutate(selectedMachine.id)} disabled={deleteMutation.isPending} className="w-full font-bold">
              {deleteMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : "Yes, Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}