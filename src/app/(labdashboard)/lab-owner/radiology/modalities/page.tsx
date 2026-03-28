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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
        return { icon: Scan, color: "text-purple-600", bg: "bg-purple-100" };
      case "CT":
        return { icon: Server, color: "text-blue-600", bg: "bg-blue-100" };
      case "XRAY":
        return { icon: Zap, color: "text-amber-600", bg: "bg-amber-100" };
      case "USG":
        return { icon: Radio, color: "text-emerald-600", bg: "bg-emerald-100" };
      default:
        return { icon: Server, color: "text-slate-600", bg: "bg-slate-100" };
    }
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6 relative">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Settings2 className="h-6 w-6 text-blue-600" />
            Modalities & Assets
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage your imaging machines, DICOM nodes, and maintenance
            schedules.
          </p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search machines..."
              className="pl-9 bg-white"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button
            onClick={() => handleOpenModal()}
            className="bg-blue-600 hover:bg-blue-700 text-white shrink-0 shadow-md">
            <Plus className="mr-2 h-4 w-4" /> Add Machine
          </Button>
        </div>
      </div>

      {/* MODALITIES GRID */}
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : filteredModalities.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-slate-200 text-slate-500">
          <Server className="h-16 w-16 mx-auto mb-4 opacity-20" />
          <p className="text-lg font-bold text-slate-700">
            No modalities found
          </p>
          <p className="text-sm mt-1">
            Add your first MRI, CT, or X-Ray machine to get started.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredModalities.map((mod: any) => {
            const visuals = getModalityVisuals(mod.type);
            const nextMaintenanceDate = mod.nextMaintenance
              ? new Date(mod.nextMaintenance)
              : null;
            const isOverdue =
              nextMaintenanceDate && nextMaintenanceDate < new Date();

            return (
              <div
                key={mod.id}
                className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col overflow-hidden">
                {/* Card Header */}
                <div className="p-5 border-b border-slate-100 flex justify-between items-start bg-slate-50/50">
                  <div className="flex gap-3 items-start">
                    <div className={`p-2.5 rounded-lg ${visuals.bg} shrink-0`}>
                      <visuals.icon className={`h-6 w-6 ${visuals.color}`} />
                    </div>
                    <div>
                      <h3
                        className="font-bold text-slate-900 text-base leading-tight line-clamp-1"
                        title={mod.name}>
                        {mod.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">
                          {mod.type}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1
                          ${
                            mod.status === "ACTIVE"
                              ? "bg-emerald-100 text-emerald-700"
                              : mod.status === "MAINTENANCE"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-slate-100 text-slate-500"
                          }`}>
                          {mod.status === "ACTIVE" && (
                            <Activity className="h-3 w-3" />
                          )}
                          {mod.status === "MAINTENANCE" && (
                            <Wrench className="h-3 w-3" />
                          )}
                          {mod.status === "INACTIVE" && (
                            <PowerOff className="h-3 w-3" />
                          )}
                          {mod.status}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Body - Network Specs */}
                <div className="p-5 space-y-4 flex-1">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1">
                        AE Title
                      </p>
                      <p
                        className="text-sm font-mono font-bold text-slate-800 truncate"
                        title={mod.aeTitle}>
                        {mod.aeTitle || "UNASSIGNED"}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                        IP:Port
                      </p>
                      <p className="text-sm font-mono font-medium text-slate-800">
                        {mod.ipAddress
                          ? `${mod.ipAddress}${mod.port ? `:${mod.port}` : ""}`
                          : "DHCP"}
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-4">
                    <div className="flex justify-between items-center text-sm text-slate-600 mb-1">
                      <span className="flex items-center gap-2 font-medium">
                        <CalendarClock className="h-4 w-4 text-slate-400" />{" "}
                        Maintenance Schedule
                      </span>
                      {isOverdue && (
                        <AlertCircle
                          className="h-4 w-4 text-red-500 animate-pulse"
                          title="Overdue!"
                        />
                      )}
                    </div>
                    <div className="flex justify-between text-xs mt-2">
                      <span className="text-slate-500">
                        Last:{" "}
                        {mod.lastMaintenance
                          ? new Date(mod.lastMaintenance).toLocaleDateString()
                          : "N/A"}
                      </span>
                      <span
                        className={`font-bold ${isOverdue ? "text-red-500" : "text-slate-700"}`}>
                        Due:{" "}
                        {mod.nextMaintenance
                          ? new Date(mod.nextMaintenance).toLocaleDateString()
                          : "N/A"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Footer - Actions */}
                <div className="p-3 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleOpenModal(mod)}
                    className="text-slate-600 hover:text-blue-600 hover:bg-blue-50">
                    <Edit className="h-4 w-4 mr-2" /> Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(mod.id)}
                    disabled={deleteMutation.isPending}
                    className="text-slate-600 hover:text-red-600 hover:bg-red-50">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <h2 className="text-lg font-bold text-slate-800">
                {editingModality?.id
                  ? "Edit Machine Configuration"
                  : "Register New Machine"}
              </h2>
            </div>

            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              {/* Core Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <Label>
                    Machine Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={editingModality?.name || ""}
                    onChange={(e) =>
                      setEditingModality({
                        ...editingModality,
                        name: e.target.value,
                      })
                    }
                    placeholder="e.g. GE 1.5T MRI Scanner"
                  />
                </div>
                <div className="space-y-2">
                  <Label>
                    Modality Type <span className="text-red-500">*</span>
                  </Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-600"
                    value={editingModality?.type || "XRAY"}
                    onChange={(e) =>
                      setEditingModality({
                        ...editingModality,
                        type: e.target.value,
                      })
                    }>
                    {modalityTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Operating Status</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-600"
                    value={editingModality?.status || "ACTIVE"}
                    onChange={(e) =>
                      setEditingModality({
                        ...editingModality,
                        status: e.target.value,
                      })
                    }>
                    <option value="ACTIVE">Active (Online)</option>
                    <option value="MAINTENANCE">Under Maintenance</option>
                    <option value="INACTIVE">Inactive (Offline)</option>
                  </select>
                </div>
              </div>

              {/* DICOM Network Settings */}
              <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg space-y-4">
                <h4 className="text-xs font-bold text-blue-800 uppercase tracking-wider flex items-center gap-2">
                  <Activity className="h-4 w-4" /> DICOM Network Configuration
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-blue-900">AE Title</Label>
                    <Input
                      value={editingModality?.aeTitle || ""}
                      onChange={(e) =>
                        setEditingModality({
                          ...editingModality,
                          aeTitle: e.target.value.toUpperCase(),
                        })
                      }
                      placeholder="e.g. MRI_ROOM_1"
                      className="uppercase font-mono text-sm border-blue-200"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-blue-900">IP Address</Label>
                    <Input
                      value={editingModality?.ipAddress || ""}
                      onChange={(e) =>
                        setEditingModality({
                          ...editingModality,
                          ipAddress: e.target.value,
                        })
                      }
                      placeholder="192.168.1.50"
                      className="font-mono text-sm border-blue-200"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-blue-900">DICOM Port</Label>
                    <Input
                      type="number"
                      value={editingModality?.port || ""}
                      onChange={(e) =>
                        setEditingModality({
                          ...editingModality,
                          port: e.target.value,
                        })
                      }
                      placeholder="e.g. 104"
                      className="font-mono text-sm border-blue-200"
                    />
                  </div>
                </div>
              </div>

              {/* Asset Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Manufacturer</Label>
                  <Input
                    value={editingModality?.manufacturer || ""}
                    onChange={(e) =>
                      setEditingModality({
                        ...editingModality,
                        manufacturer: e.target.value,
                      })
                    }
                    placeholder="e.g. GE Healthcare, Siemens"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Location / Room</Label>
                  <Input
                    value={editingModality?.location || ""}
                    onChange={(e) =>
                      setEditingModality({
                        ...editingModality,
                        location: e.target.value,
                      })
                    }
                    placeholder="e.g. Ground Floor, Room A"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Last Maintenance Date</Label>
                  <Input
                    type="date"
                    value={editingModality?.lastMaintenance || ""}
                    onChange={(e) =>
                      setEditingModality({
                        ...editingModality,
                        lastMaintenance: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Next Due Date</Label>
                  <Input
                    type="date"
                    value={editingModality?.nextMaintenance || ""}
                    onChange={(e) =>
                      setEditingModality({
                        ...editingModality,
                        nextMaintenance: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={saveMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700 text-white min-w-[120px]">
                {saveMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                {saveMutation.isPending ? "Saving..." : "Save Machine"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
