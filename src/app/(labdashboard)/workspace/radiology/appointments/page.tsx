"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, addDays, subDays } from "date-fns";
import {
  Calendar,
  Clock,
  Search,
  Plus,
  ChevronLeft,
  ChevronRight,
  User,
  CheckCircle2,
  Activity,
  AlertCircle,
  ScanLine,
  Loader2,
  X,
  Microscope,
  Phone,
  Fingerprint,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import toast from "react-hot-toast";

export default function RadiologyAppointmentsPage() {
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState("");
  const [activeModality, setActiveModality] = useState("ALL");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    patientId: "",
    modalityId: "",
    scanName: "",
    timeStr: "09:00",
    notes: "",
  });

  // 1. Fetch Data
  const { data, isLoading } = useQuery({
    queryKey: ["radiology-appointments", format(selectedDate, "yyyy-MM-dd")],
    queryFn: async () => {
      const res = await fetch(
        `/api/workspace/radiology/appointments?date=${selectedDate.toISOString()}`,
      );
      if (!res.ok) throw new Error("Failed to load schedule");
      return res.json();
    },
  });

  // 2. Status Update Mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({
      appointmentId,
      status,
    }: {
      appointmentId: string;
      status: string;
    }) => {
      const res = await fetch("/api/workspace/radiology/appointments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointmentId, status }),
      });
      if (!res.ok) throw new Error("Status update failed");
      return res.json();
    },
    onSuccess: (res) => {
      toast.success(res.message);
      queryClient.invalidateQueries({ queryKey: ["radiology-appointments"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  // 3. Book Appointment Mutation
  const bookMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/workspace/radiology/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to book appointment");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Appointment Booked Successfully!");
      setIsModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["radiology-appointments"] });
      // Reset form
      setFormData({
        patientId: "",
        modalityId: "",
        scanName: "",
        timeStr: "09:00",
        notes: "",
      });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const handleBookSubmit = () => {
    if (!formData.patientId || !formData.modalityId || !formData.scanName) {
      return toast.error("Please fill all required fields.");
    }

    // Combine selectedDate + timeStr to create the scheduledStart DateTime
    const [hours, minutes] = formData.timeStr.split(":");
    const scheduledStart = new Date(selectedDate);
    scheduledStart.setHours(parseInt(hours), parseInt(minutes), 0);

    // Assume 30 min duration for simplicity
    const scheduledEnd = new Date(scheduledStart.getTime() + 30 * 60000);

    bookMutation.mutate({
      ...formData,
      scheduledStart: scheduledStart.toISOString(),
      scheduledEnd: scheduledEnd.toISOString(),
    });
  };

  // UI Helpers
  const appointments = data?.appointments || [];
  const modalities = data?.modalities || [];
  const patients = data?.patients || [];

  const uniqueModalityTypes = Array.from(
    new Set(modalities.map((m: any) => m.type)),
  );

  const filteredAppointments = appointments.filter((apt: any) => {
    const matchesSearch =
      apt.patient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (apt.study?.accessionNumber || "")
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
    const matchesModality =
      activeModality === "ALL" || apt.modality.type === activeModality;
    return matchesSearch && matchesModality;
  });

  const getStatusVisuals = (status: string) => {
    switch (status) {
      case "SCHEDULED":
        return {
          color: "text-slate-600",
          bg: "bg-slate-100",
          border: "border-slate-200",
          label: "Scheduled",
        };
      case "ARRIVED":
        return {
          color: "text-amber-700",
          bg: "bg-amber-100",
          border: "border-amber-200",
          label: "Lobby",
        };
      case "IN_PROGRESS":
        return {
          color: "text-indigo-700",
          bg: "bg-indigo-100",
          border: "border-indigo-200",
          label: "In Machine",
        };
      case "COMPLETED":
        return {
          color: "text-emerald-700",
          bg: "bg-emerald-100",
          border: "border-emerald-200",
          label: "Completed",
        };
      default:
        return {
          color: "text-slate-600",
          bg: "bg-slate-100",
          border: "border-slate-200",
          label: status,
        };
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 font-sans relative selection:bg-indigo-100 pb-12">
      {/* Decorative Background Mesh */}
      <div className="absolute top-0 inset-x-0 h-64 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-100/40 via-slate-50 to-transparent pointer-events-none z-0" />

      {/* FLOATING HEADER & DATE NAVIGATION */}
      <header className="sticky top-0 z-30 bg-white/70 backdrop-blur-xl border-b border-slate-200/60 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center shadow-inner shrink-0">
              <Microscope className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight leading-tight">
                Radiology Schedule
              </h1>
              <p className="text-xs font-medium text-slate-500 mt-0.5">
                Manage time slots and track machine utilization.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            {/* Premium Date Navigator */}
            <div className="flex items-center bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden h-11 w-full md:w-auto">
              <button
                onClick={() => setSelectedDate(subDays(selectedDate, 1))}
                className="h-full px-3 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors border-r border-slate-100 flex items-center justify-center">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div className="px-4 py-2 font-bold text-sm text-slate-800 min-w-[150px] text-center flex-1 flex justify-center items-center gap-2">
                <Calendar className="h-4 w-4 text-indigo-500" />
                {format(selectedDate, "MMM dd, yyyy")}
              </div>
              <button
                onClick={() => setSelectedDate(addDays(selectedDate, 1))}
                className="h-full px-3 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors border-l border-slate-100 flex items-center justify-center">
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>

            <Button
              onClick={() => setIsModalOpen(true)}
              className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shrink-0 shadow-md shadow-indigo-500/25 h-11 rounded-xl px-5 font-bold transition-all duration-300 hover:-translate-y-0.5">
              <Plus className="mr-1.5 h-5 w-5" /> Book Scan
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10 space-y-6">
        {/* FILTERS & TOOLBAR */}
        <div className="bg-white p-2 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row justify-between gap-2">
          {/* Modality Pills */}
          <div className="flex gap-1 bg-slate-50/80 p-1.5 rounded-xl overflow-x-auto custom-scrollbar border border-slate-100">
            {["ALL", ...uniqueModalityTypes].map((mod: any) => (
              <button
                key={mod}
                onClick={() => setActiveModality(mod)}
                className={`px-5 py-2 text-xs font-bold rounded-lg whitespace-nowrap transition-all ${
                  activeModality === mod
                    ? "bg-white text-indigo-700 shadow-sm border border-slate-200/50"
                    : "text-slate-500 hover:text-slate-800 hover:bg-slate-100/50"
                }`}>
                {mod}
              </button>
            ))}
          </div>

          {/* Search Bar */}
          <div className="relative w-full md:w-[320px] shrink-0">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search patient or Accession..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-11 bg-slate-50 border-slate-100 focus:bg-white focus:border-indigo-300 focus:ring-indigo-500/20 rounded-xl text-sm transition-all"
            />
          </div>
        </div>

        {/* APPOINTMENT TABLE / LIST */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden min-h-[500px]">
          {isLoading ? (
            <div className="flex flex-col h-[400px] items-center justify-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest animate-pulse">
                Loading Schedule
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left text-sm text-slate-600 whitespace-nowrap">
                <thead className="bg-slate-50/80 backdrop-blur-sm text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200/80">
                  <tr>
                    <th className="px-6 py-4 w-32">Time Slot</th>
                    <th className="px-6 py-4">Patient Identity</th>
                    <th className="px-6 py-4">Scan & Modality</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Workflow Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAppointments.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-20 text-center">
                        <div className="flex flex-col items-center justify-center text-slate-400 space-y-3">
                          <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center">
                            <Calendar className="h-8 w-8 text-slate-300" />
                          </div>
                          <div>
                            <p className="font-bold text-slate-600 text-base">
                              No Appointments Found
                            </p>
                            <p className="text-xs mt-1">
                              There are no bookings matching your criteria for
                              this date.
                            </p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredAppointments.map((apt: any) => {
                      const statusInfo = getStatusVisuals(apt.status);
                      const initials = apt.patient.name
                        .split(" ")
                        .map((n: string) => n[0])
                        .join("")
                        .substring(0, 2)
                        .toUpperCase();

                      return (
                        <tr
                          key={apt.id}
                          className="hover:bg-slate-50/80 transition-colors group">
                          {/* Time */}
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-slate-400" />
                              <span className="font-bold text-slate-900 text-base">
                                {format(
                                  new Date(apt.scheduledStart),
                                  "hh:mm a",
                                )}
                              </span>
                            </div>
                          </td>

                          {/* Patient */}
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-4">
                              <Avatar className="h-10 w-10 border border-slate-200 shadow-sm hidden sm:flex">
                                <AvatarFallback className="bg-slate-100 text-slate-600 font-bold text-xs">
                                  {initials}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex flex-col min-w-0">
                                <span className="font-bold text-slate-900 truncate">
                                  {apt.patient.name}
                                </span>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 flex items-center gap-1">
                                    <Fingerprint className="h-2.5 w-2.5" />{" "}
                                    {apt.study?.accessionNumber || "N/A"}
                                  </span>
                                  <span className="text-[10px] font-medium text-slate-500 flex items-center gap-1">
                                    <Phone className="h-2.5 w-2.5" />{" "}
                                    {apt.patient.phone}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Scan & Modality */}
                          <td className="px-6 py-4">
                            <div className="flex flex-col items-start gap-1">
                              <span className="font-bold text-slate-900">
                                {apt.scanName}
                              </span>
                              <div className="flex items-center gap-2 mt-0.5">
                                <Badge
                                  variant="outline"
                                  className="text-[9px] font-bold uppercase tracking-wider bg-slate-50 text-slate-700 border-slate-200">
                                  {apt.modality.type}
                                </Badge>
                                <span className="text-[10px] font-medium text-slate-500">
                                  {apt.modality.name}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Status */}
                          <td className="px-6 py-4">
                            <span
                              className={`px-2.5 py-1 text-[10px] font-bold rounded-md uppercase tracking-wider flex w-max items-center gap-1.5 border shadow-sm ${statusInfo.bg} ${statusInfo.color} ${statusInfo.border}`}>
                              {apt.status === "SCHEDULED" && (
                                <Calendar className="h-3 w-3" />
                              )}
                              {apt.status === "ARRIVED" && (
                                <User className="h-3 w-3" />
                              )}
                              {apt.status === "IN_PROGRESS" && (
                                <Activity className="h-3 w-3 animate-pulse" />
                              )}
                              {apt.status === "COMPLETED" && (
                                <CheckCircle2 className="h-3 w-3" />
                              )}
                              {statusInfo.label}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-2 items-center">
                              {apt.status === "SCHEDULED" && (
                                <Button
                                  size="sm"
                                  onClick={() =>
                                    updateStatusMutation.mutate({
                                      appointmentId: apt.id,
                                      status: "ARRIVED",
                                    })
                                  }
                                  disabled={updateStatusMutation.isPending}
                                  className="bg-amber-100 text-amber-800 hover:bg-amber-200 border border-amber-200 h-9 rounded-lg text-xs font-bold shadow-sm transition-colors">
                                  Check-In
                                </Button>
                              )}
                              {apt.status === "ARRIVED" && (
                                <Button
                                  size="sm"
                                  onClick={() =>
                                    updateStatusMutation.mutate({
                                      appointmentId: apt.id,
                                      status: "IN_PROGRESS",
                                    })
                                  }
                                  disabled={updateStatusMutation.isPending}
                                  className="bg-indigo-600 hover:bg-indigo-700 text-white h-9 rounded-lg text-xs font-bold shadow-sm transition-all hover:-translate-y-0.5">
                                  <ScanLine className="h-3 w-3 mr-1.5" /> Start
                                  Scan
                                </Button>
                              )}
                              {apt.status === "IN_PROGRESS" && (
                                <Button
                                  size="sm"
                                  onClick={() =>
                                    updateStatusMutation.mutate({
                                      appointmentId: apt.id,
                                      status: "COMPLETED",
                                    })
                                  }
                                  disabled={updateStatusMutation.isPending}
                                  className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-200 h-9 rounded-lg text-xs font-bold shadow-sm transition-colors">
                                  Complete
                                </Button>
                              )}
                              {apt.status === "COMPLETED" && (
                                <Badge
                                  variant="secondary"
                                  className="bg-slate-100 text-slate-500 hover:bg-slate-100 text-[10px] uppercase font-bold border-none">
                                  Sent to PACs
                                </Badge>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* --- BOOK APPOINTMENT MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100 flex flex-col max-h-[90vh]">
            <div className="px-6 py-5 border-b border-slate-100 bg-white flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Book Radiology Scan
                </h2>
                <p className="text-xs font-medium text-slate-500 mt-0.5">
                  Scheduling for {format(selectedDate, "MMM dd, yyyy")}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsModalOpen(false)}
                className="h-8 w-8 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full">
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto custom-scrollbar">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Select Patient <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
                  <select
                    className="flex h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm font-medium outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all appearance-none cursor-pointer"
                    value={formData.patientId}
                    onChange={(e) =>
                      setFormData({ ...formData, patientId: e.target.value })
                    }>
                    <option value="" disabled>
                      -- Choose Registered Patient --
                    </option>
                    {patients.map((p: any) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.phone})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Modality <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Microscope className="absolute left-3 top-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
                    <select
                      className="flex h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm font-medium outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all appearance-none cursor-pointer"
                      value={formData.modalityId}
                      onChange={(e) =>
                        setFormData({ ...formData, modalityId: e.target.value })
                      }>
                      <option value="" disabled>
                        -- Select Machine --
                      </option>
                      {modalities.map((m: any) => (
                        <option key={m.id} value={m.id}>
                          {m.type} ({m.name})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Scan Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    placeholder="e.g. MRI Brain with Contrast"
                    value={formData.scanName}
                    onChange={(e) =>
                      setFormData({ ...formData, scanName: e.target.value })
                    }
                    className="h-11 rounded-xl bg-slate-50 border-slate-200 focus:bg-white focus:ring-indigo-500/20 text-sm font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Time Slot <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Clock className="absolute right-3 top-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
                    <Input
                      type="time"
                      value={formData.timeStr}
                      onChange={(e) =>
                        setFormData({ ...formData, timeStr: e.target.value })
                      }
                      className="h-11 rounded-xl bg-slate-50 border-slate-200 focus:bg-white focus:ring-indigo-500/20 text-sm font-medium pr-10"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Front Desk Notes
                  </Label>
                  <Input
                    placeholder="Safety alerts, instructions..."
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                    className="h-11 rounded-xl bg-slate-50 border-slate-200 focus:bg-white focus:ring-indigo-500/20 text-sm font-medium"
                  />
                </div>
              </div>

              <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl text-xs font-medium text-indigo-800 flex gap-3">
                <AlertCircle className="h-5 w-5 shrink-0 text-indigo-500" />
                <p className="leading-relaxed">
                  Booking this appointment will automatically generate a DICOM
                  Accession Number and push the order to the{" "}
                  <strong>Modality Worklist (MWL)</strong>.
                </p>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex flex-col-reverse sm:flex-row justify-end gap-3 shrink-0">
              <Button
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                className="h-11 rounded-xl font-bold text-slate-600 bg-white w-full sm:w-auto">
                Cancel
              </Button>
              <Button
                onClick={handleBookSubmit}
                disabled={bookMutation.isPending}
                className="bg-indigo-600 hover:bg-indigo-700 text-white h-11 rounded-xl font-bold shadow-md shadow-indigo-500/25 w-full sm:w-auto transition-all">
                {bookMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                {bookMutation.isPending ? "Processing..." : "Confirm Booking"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
