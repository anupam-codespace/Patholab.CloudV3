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
  MoreVertical,
  Activity,
  AlertCircle,
  ScanLine,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
        `/api/lab-owner/radiology/appointments?date=${selectedDate.toISOString()}`,
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
      const res = await fetch("/api/lab-owner/radiology/appointments", {
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
      const res = await fetch("/api/lab-owner/radiology/appointments", {
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
          color: "text-amber-600",
          bg: "bg-amber-100",
          border: "border-amber-200",
          label: "Lobby",
        };
      case "IN_PROGRESS":
        return {
          color: "text-blue-600",
          bg: "bg-blue-100",
          border: "border-blue-200",
          label: "In Machine",
        };
      case "COMPLETED":
        return {
          color: "text-emerald-600",
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
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      {/* HEADER & DATE NAVIGATION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Calendar className="h-6 w-6 text-blue-600" />
            Scheduling & Patient Flow
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage time slots, track patient arrivals, and machine utilization.
          </p>
        </div>

        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="flex items-center bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedDate(subDays(selectedDate, 1))}
              className="rounded-none h-10 w-10">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="px-4 py-2 font-bold text-sm text-slate-800 min-w-[150px] text-center border-x border-slate-100">
              {format(selectedDate, "MMM dd, yyyy")}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedDate(addDays(selectedDate, 1))}
              className="rounded-none h-10 w-10">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <Button
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white shrink-0 shadow-md">
            <Plus className="mr-2 h-4 w-4" /> Book Scan
          </Button>
        </div>
      </div>

      {/* FILTERS & TOOLBAR */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between gap-4">
        <div className="flex gap-2 bg-slate-100 p-1 rounded-lg overflow-x-auto scrollbar-hide">
          {["ALL", ...uniqueModalityTypes].map((mod: any) => (
            <button
              key={mod}
              onClick={() => setActiveModality(mod)}
              className={`px-4 py-1.5 text-xs font-bold rounded-md whitespace-nowrap transition-colors ${
                activeModality === mod
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}>
              {mod}
            </button>
          ))}
        </div>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search patient or Accession..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-white"
          />
        </div>
      </div>

      {/* APPOINTMENT TABLE */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden min-h-[500px]">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100 whitespace-nowrap">
                <tr>
                  <th className="px-6 py-4 w-32">Time Slot</th>
                  <th className="px-6 py-4">Patient Details</th>
                  <th className="px-6 py-4">Scan & Machine</th>
                  <th className="px-6 py-4">Current Status</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAppointments.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-16 text-center text-slate-400">
                      <Calendar className="h-12 w-12 mx-auto mb-3 opacity-20" />
                      <p>No appointments booked for this modality today.</p>
                    </td>
                  </tr>
                ) : (
                  filteredAppointments.map((apt: any) => {
                    const statusInfo = getStatusVisuals(apt.status);

                    return (
                      <tr
                        key={apt.id}
                        className="hover:bg-slate-50 transition-colors group">
                        <td className="px-6 py-4">
                          <span className="font-bold text-slate-900 text-base">
                            {format(new Date(apt.scheduledStart), "hh:mm a")}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-900">
                              {apt.patient.name}
                            </span>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                                {apt.study?.accessionNumber || "N/A"}
                              </span>
                              <span className="text-xs text-slate-500">
                                {apt.patient.phone}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col items-start gap-1">
                            <span className="font-bold text-slate-800">
                              {apt.scanName}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border bg-slate-100 text-slate-700">
                                {apt.modality.type}
                              </span>
                              <span className="text-[11px] font-medium text-slate-500">
                                {apt.modality.name}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-2.5 py-1 text-[10px] font-bold rounded-full uppercase flex w-max items-center gap-1.5 border ${statusInfo.bg} ${statusInfo.color} ${statusInfo.border}`}>
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
                                className="bg-amber-100 text-amber-700 hover:bg-amber-200 h-8 text-xs font-bold">
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
                                className="bg-blue-600 hover:bg-blue-700 text-white h-8 text-xs font-bold">
                                <ScanLine className="h-3 w-3 mr-1" /> Start Scan
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
                                className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 h-8 text-xs font-bold">
                                Complete
                              </Button>
                            )}
                            {apt.status === "COMPLETED" && (
                              <span className="text-xs font-bold text-slate-400 mr-2">
                                Sent to PACs
                              </span>
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

      {/* BOOK APPOINTMENT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
              <h2 className="text-lg font-bold text-slate-800">
                Book Scan for {format(selectedDate, "MMM dd, yyyy")}
              </h2>
            </div>

            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <Label>Select Patient</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-600"
                  value={formData.patientId}
                  onChange={(e) =>
                    setFormData({ ...formData, patientId: e.target.value })
                  }>
                  <option value="" disabled>
                    -- Select Registered Patient --
                  </option>
                  {patients.map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.phone})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Modality / Machine</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-600"
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
                <div className="space-y-2">
                  <Label>Scan Name</Label>
                  <Input
                    placeholder="e.g. MRI Brain"
                    value={formData.scanName}
                    onChange={(e) =>
                      setFormData({ ...formData, scanName: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Time Slot</Label>
                  <Input
                    type="time"
                    value={formData.timeStr}
                    onChange={(e) =>
                      setFormData({ ...formData, timeStr: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Front Desk Notes</Label>
                  <Input
                    placeholder="Safety alerts, instructions..."
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg text-xs text-amber-800 flex gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <p>
                  Booking this appointment will automatically generate a DICOM
                  Accession Number and push it to the Modality Worklist (MWL).
                </p>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleBookSubmit}
                disabled={bookMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700 text-white min-w-[140px]">
                {bookMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                {bookMutation.isPending ? "Booking..." : "Confirm Booking"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
