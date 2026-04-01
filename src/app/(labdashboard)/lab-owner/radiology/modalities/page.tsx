"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Server,
  Plus,
  Search,
  Wrench,
  Activity,
  PowerOff,
  Edit,
  Trash2,
  Settings2,
  CalendarClock,
  Radio,
  Scan,
  Zap,
  Loader2,
  AlertCircle,
  X,
  Network
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import toast from "react-hot-toast";

const modalityTypes = ["MRI", "CT", "XRAY", "USG", "PET", "MAMMO", "DEXA"];

export default function ModalitiesPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingModality, setEditingModality] = useState<any>(null);

  // 1. Fetch Modalities
  const { data: modalities = [], isLoading } = useQuery({
    queryKey: ["radiology-modalities"],
    queryFn: async () => {
      const res = await fetch("/api/lab-owner/radiology/modalities");
      if (!res.ok) throw new Error("Failed to fetch modalities");
      return res.json();
    },
  });

  // 2. Save/Update Mutation
  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      const isEditing = !!payload.id;
      const res = await fetch("/api/lab-owner/radiology/modalities", {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");
      return data;
    },
    onSuccess: (res) => {
      toast.success(res.message);
      setIsModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["radiology-modalities"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  // 3. Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/lab-owner/radiology/modalities?id=${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete");
      return data;
    },
    onSuccess: (res) => {
      toast.success(res.message);
      queryClient.invalidateQueries({ queryKey: ["radiology-modalities"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Filter Logic
  const filteredModalities = modalities.filter(
    (mod: any) =>
      mod.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (mod.aeTitle || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      mod.type.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleOpenModal = (modality = null) => {
    if (modality) {
      setEditingModality({
        ...modality,
        lastMaintenance: modality.lastMaintenance
          ? new Date(modality.lastMaintenance).toISOString().split("T")[0]
          : "",
        nextMaintenance: modality.nextMaintenance
          ? new Date(modality.nextMaintenance).toISOString().split("T")[0]
          : "",
      });
    } else {
      setEditingModality({
        name: "",
        type: "XRAY",
        aeTitle: "",
        ipAddress: "",
        port: "",
        location: "",
        manufacturer: "",
        status: "ACTIVE",
        lastMaintenance: "",
        nextMaintenance: "",
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!editingModality.name || !editingModality.type) {
      return toast.error("Name and Type are required.");
    }
    saveMutation.mutate(editingModality);
  };

  const handleDelete = (id: string) => {
    if (
      confirm(
        "Are you sure you want to delete this machine? This action cannot be undone.",
      )
    ) {
      deleteMutation.mutate(id);
    }
  };

  // Visual Helpers
  const getModalityVisuals = (type: string) => {
    switch (type) {
      case "MRI":
        return { icon: Scan, color: "text-violet-600", bg: "bg-violet-100", border: "border-violet-200" };
      case "CT":
        return { icon: Server, color: "text-indigo-600", bg: "bg-indigo-100", border: "border-indigo-200" };
      case "XRAY":
        return { icon: Zap, color: "text-amber-600", bg: "bg-amber-100", border: "border-amber-200" };
      case "USG":
        return { icon: Radio, color: "text-emerald-600", bg: "bg-emerald-100", border: "border-emerald-200" };
      default:
        return { icon: Server, color: "text-slate-600", bg: "bg-slate-100", border: "border-slate-200" };
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 font-sans relative selection:bg-indigo-100 pb-12">
      
      {/* Decorative Background Mesh */}
      <div className="absolute top-0 inset-x-0 h-64 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-100/40 via-slate-50 to-transparent pointer-events-none z-0" />

      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10 space-y-6">
        
        {/* NON-STICKY HEADER CARD */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-5 bg-white/70 backdrop-blur-xl p-5 rounded-2xl border border-slate-200/60 shadow-sm">
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="h-12 w-12 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center shadow-inner shrink-0">
              <Settings2 className="h-6 w-6 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight leading-tight truncate">
                Modalities & Assets
              </h1>
              <p className="text-xs font-medium text-slate-500 mt-0.5 truncate">
                Manage imaging machines, DICOM nodes, and maintenance schedules.
              </p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search machines..."
                className="pl-9 h-11 bg-white border-slate-200 focus:border-indigo-300 focus:ring-indigo-500/20 rounded-xl text-sm transition-all shadow-sm w-full"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button
              onClick={() => handleOpenModal()}
              className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-md shadow-indigo-500/25 h-11 rounded-xl px-6 font-bold transition-all duration-300 hover:-translate-y-0.5 w-full sm:w-auto shrink-0">
              <Plus className="mr-1.5 h-5 w-5" /> Add Machine
            </Button>
          </div>
        </div>

        {/* MODALITIES GRID */}
        {isLoading ? (
          <div className="flex flex-col h-[400px] items-center justify-center space-y-4">
             <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
             <p className="text-sm font-bold text-slate-400 uppercase tracking-widest animate-pulse">Loading Assets</p>
          </div>
        ) : filteredModalities.length === 0 ? (
          <div className="text-center py-20 bg-white/50 backdrop-blur-sm rounded-3xl border border-slate-200/60 shadow-sm flex flex-col items-center justify-center px-4">
            <div className="h-20 w-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <Server className="h-10 w-10 text-slate-300" />
            </div>
            <p className="text-lg font-bold text-slate-700">No modalities found</p>
            <p className="text-sm text-slate-500 mt-1 max-w-sm">
              Add your first MRI, CT, or X-Ray machine to start tracking utilization and DICOM routing.
            </p>
            <Button onClick={() => handleOpenModal()} variant="outline" className="mt-6 h-10 rounded-xl bg-white border-slate-200 font-bold text-slate-700 w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" /> Add Machine Now
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredModalities.map((mod: any) => {
              const visuals = getModalityVisuals(mod.type);
              const nextMaintenanceDate = mod.nextMaintenance ? new Date(mod.nextMaintenance) : null;
              const isOverdue = nextMaintenanceDate && nextMaintenanceDate < new Date();

              return (
                <div
                  key={mod.id}
                  className="bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col overflow-hidden group">
                  
                  {/* Card Header */}
                  <div className="p-4 sm:p-5 border-b border-slate-100 flex justify-between items-start bg-slate-50/50">
                    <div className="flex gap-3 sm:gap-4 items-start min-w-0 w-full">
                      <div className={`p-2.5 sm:p-3 rounded-xl border ${visuals.bg} ${visuals.border} shrink-0 shadow-sm`}>
                        <visuals.icon className={`h-5 w-5 sm:h-6 sm:w-6 ${visuals.color}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-slate-900 text-sm sm:text-base leading-tight truncate" title={mod.name}>
                          {mod.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider bg-white border-slate-200 text-slate-700 shadow-sm shrink-0">
                            {mod.type}
                          </Badge>
                          <Badge variant="outline" className={`text-[9px] font-bold uppercase tracking-wider border-none shadow-sm flex items-center gap-1 shrink-0
                          ${
                            mod.status === "ACTIVE"
                              ? "bg-emerald-100 text-emerald-700"
                              : mod.status === "MAINTENANCE"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-slate-100 text-slate-500"
                          }`}>
                            {mod.status === "ACTIVE" && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>}
                            {mod.status === "MAINTENANCE" && <Wrench className="h-2.5 w-2.5 shrink-0" />}
                            {mod.status === "INACTIVE" && <PowerOff className="h-2.5 w-2.5 shrink-0" />}
                            {mod.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card Body - Network Specs */}
                  <div className="p-4 sm:p-5 space-y-5 flex-1">
                    <div className="grid grid-cols-2 gap-3 sm:gap-4 bg-slate-50/80 p-3 rounded-xl border border-slate-100">
                      <div className="space-y-1 min-w-0">
                        <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1">
                          AE Title
                        </p>
                        <p className="text-xs font-mono font-bold text-slate-800 truncate" title={mod.aeTitle}>
                          {mod.aeTitle || "UNASSIGNED"}
                        </p>
                      </div>
                      <div className="space-y-1 min-w-0">
                        <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                          IP:Port
                        </p>
                        <p className="text-xs font-mono font-medium text-slate-800 truncate" title={mod.ipAddress ? `${mod.ipAddress}${mod.port ? `:${mod.port}` : ""}` : "DHCP"}>
                          {mod.ipAddress ? `${mod.ipAddress}${mod.port ? `:${mod.port}` : ""}` : "DHCP"}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between items-center text-sm text-slate-600">
                        <span className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-slate-500">
                          <CalendarClock className="h-4 w-4 text-indigo-400 shrink-0" /> Maintenance
                        </span>
                        {isOverdue && (
                          <span title="Overdue!" className="flex items-center">
                            <AlertCircle className="h-4 w-4 text-rose-500 animate-pulse shrink-0" />
                          </span>
                        )}
                      </div>
                      <div className="flex justify-between items-center bg-white border border-slate-100 rounded-lg p-2.5 shadow-sm">
                        <div className="flex flex-col min-w-0 pr-2">
                           <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider truncate">Last Serviced</span>
                           <span className="text-[11px] sm:text-xs font-medium text-slate-700 truncate">
                             {mod.lastMaintenance ? new Date(mod.lastMaintenance).toLocaleDateString() : "N/A"}
                           </span>
                        </div>
                        <div className="h-6 w-px bg-slate-200 shrink-0" />
                        <div className="flex flex-col text-right min-w-0 pl-2">
                           <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider truncate">Next Due</span>
                           <span className={`text-[11px] sm:text-xs font-bold truncate ${isOverdue ? "text-rose-600" : "text-slate-900"}`}>
                             {mod.nextMaintenance ? new Date(mod.nextMaintenance).toLocaleDateString() : "N/A"}
                           </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer - Actions */}
                  <div className="p-3 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-2 shrink-0 transition-colors group-hover:bg-slate-50">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenModal(mod)}
                      className="text-slate-600 hover:text-indigo-700 hover:bg-indigo-50 h-8 rounded-lg text-xs font-bold transition-colors">
                      <Edit className="h-3.5 w-3.5 mr-1.5" /> Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(mod.id)}
                      disabled={deleteMutation.isPending}
                      className="text-slate-500 hover:text-rose-600 hover:bg-rose-50 h-8 w-8 p-0 rounded-lg transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ADD/EDIT MODAL */}
        {isModalOpen && (
          // 1. Changed padding to ensure it clears the top navbar on all screens
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 pt-20 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            
            {/* 2. Adjusted max-height to guarantee it stays inside the viewport */}
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100 flex flex-col max-h-[85vh]">
              
              {/* Modal Header */}
              <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-slate-100 bg-white flex justify-between items-center shrink-0">
                <div className="min-w-0 pr-4">
                   <h2 className="text-base sm:text-lg font-bold text-slate-900 truncate">
                     {editingModality?.id ? "Edit Machine Configuration" : "Register New Machine"}
                   </h2>
                   <p className="text-[10px] sm:text-xs font-medium text-slate-500 mt-0.5 truncate">Configure hardware details and DICOM routing specs.</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setIsModalOpen(false)} className="h-8 w-8 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full shrink-0">
                   <X className="h-5 w-5"/>
                </Button>
              </div>

              {/* Modal Body - Scrollable Area */}
              <div className="p-4 sm:p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
                
                {/* Core Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                  <div className="space-y-1.5 md:col-span-2">
                    <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Machine Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      value={editingModality?.name || ""}
                      onChange={(e) => setEditingModality({ ...editingModality, name: e.target.value })}
                      placeholder="e.g. GE 1.5T MRI Scanner"
                      className="h-11 rounded-xl bg-slate-50 border-slate-200 focus:bg-white focus:ring-indigo-500/20 font-medium"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Modality Type <span className="text-red-500">*</span>
                    </Label>
                    <select
                      className="flex h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all appearance-none cursor-pointer"
                      value={editingModality?.type || "XRAY"}
                      onChange={(e) => setEditingModality({ ...editingModality, type: e.target.value })}>
                      {modalityTypes.map((type) => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Operating Status
                    </Label>
                    <select
                      className="flex h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all appearance-none cursor-pointer"
                      value={editingModality?.status || "ACTIVE"}
                      onChange={(e) => setEditingModality({ ...editingModality, status: e.target.value })}>
                      <option value="ACTIVE">Active (Online)</option>
                      <option value="MAINTENANCE">Under Maintenance</option>
                      <option value="INACTIVE">Inactive (Offline)</option>
                    </select>
                  </div>
                </div>

                {/* DICOM Network Settings */}
                <div className="p-4 sm:p-5 bg-indigo-50/40 border border-indigo-100 rounded-2xl space-y-4">
                  <h4 className="text-[11px] sm:text-xs font-bold text-indigo-800 uppercase tracking-wider flex items-center gap-2">
                    <Network className="h-4 w-4 text-indigo-500" /> DICOM Network Configuration
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold text-indigo-900 uppercase tracking-wider">AE Title</Label>
                      <Input
                        value={editingModality?.aeTitle || ""}
                        onChange={(e) => setEditingModality({ ...editingModality, aeTitle: e.target.value.toUpperCase() })}
                        placeholder="e.g. MRI_ROOM_1"
                        className="h-10 rounded-xl bg-white border-indigo-200 focus:ring-indigo-500/20 uppercase font-mono text-xs"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold text-indigo-900 uppercase tracking-wider">IP Address</Label>
                      <Input
                        value={editingModality?.ipAddress || ""}
                        onChange={(e) => setEditingModality({ ...editingModality, ipAddress: e.target.value })}
                        placeholder="192.168.1.50"
                        className="h-10 rounded-xl bg-white border-indigo-200 focus:ring-indigo-500/20 font-mono text-xs"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold text-indigo-900 uppercase tracking-wider">DICOM Port</Label>
                      <Input
                        type="number"
                        value={editingModality?.port || ""}
                        onChange={(e) => setEditingModality({ ...editingModality, port: e.target.value })}
                        placeholder="e.g. 104"
                        className="h-10 rounded-xl bg-white border-indigo-200 focus:ring-indigo-500/20 font-mono text-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* Asset Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Manufacturer</Label>
                    <Input
                      value={editingModality?.manufacturer || ""}
                      onChange={(e) => setEditingModality({ ...editingModality, manufacturer: e.target.value })}
                      placeholder="e.g. GE Healthcare"
                      className="h-11 rounded-xl bg-slate-50 border-slate-200 focus:bg-white focus:ring-indigo-500/20 font-medium text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Location / Room</Label>
                    <Input
                      value={editingModality?.location || ""}
                      onChange={(e) => setEditingModality({ ...editingModality, location: e.target.value })}
                      placeholder="e.g. Ground Floor, Room A"
                      className="h-11 rounded-xl bg-slate-50 border-slate-200 focus:bg-white focus:ring-indigo-500/20 font-medium text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Last Serviced Date</Label>
                    <Input
                      type="date"
                      value={editingModality?.lastMaintenance || ""}
                      onChange={(e) => setEditingModality({ ...editingModality, lastMaintenance: e.target.value })}
                      className="h-11 rounded-xl bg-slate-50 border-slate-200 focus:bg-white focus:ring-indigo-500/20 text-sm font-medium"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Next Due Date</Label>
                    <Input
                      type="date"
                      value={editingModality?.nextMaintenance || ""}
                      onChange={(e) => setEditingModality({ ...editingModality, nextMaintenance: e.target.value })}
                      className="h-11 rounded-xl bg-slate-50 border-slate-200 focus:bg-white focus:ring-indigo-500/20 text-sm font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* 3. Reordered and resized buttons for better mobile UX */}
              <div className="px-4 sm:px-6 py-4 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row justify-end gap-3 shrink-0">
                <Button variant="outline" onClick={() => setIsModalOpen(false)} className="h-11 rounded-xl font-bold text-slate-600 bg-white w-full sm:w-auto order-2 sm:order-1">
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={saveMutation.isPending}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white h-11 rounded-xl font-bold shadow-md shadow-indigo-500/25 w-full sm:w-auto transition-all order-1 sm:order-2">
                  {saveMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  {saveMutation.isPending ? "Saving..." : "Save Machine"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}