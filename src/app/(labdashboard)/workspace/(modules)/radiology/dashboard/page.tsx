"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Activity,
  CalendarClock,
  FileText,
  TrendingUp,
  MonitorPlay,
  Clock,
  AlertCircle,
  ArrowRight,
  Stethoscope,
  Loader2,
  Server,
  CheckCircle2,
  Plus,
  Calendar,
  Users,
  ChevronRight,
  X,
  User,
  Microscope,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import toast from "react-hot-toast";

// ─── API fetchers ────────────────────────────────────────────────────────────

const fetchDashboardData = async () => {
  const res = await fetch("/api/workspace/radiology/dashboard");
  if (!res.ok) throw new Error("Failed to fetch data");
  return res.json();
};

const fetchBookingFormData = async () => {
  // Reuse the appointments endpoint — it returns { patients, modalities, appointments }
  const res = await fetch("/api/workspace/radiology/appointments");
  if (!res.ok) throw new Error("Failed to load booking data");
  return res.json();
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function RisDashboard() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Modal open state
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form state — mirrors appointments/page.tsx exactly
  const [formData, setFormData] = useState({
    patientId: "",
    modalityId: "",
    scanName: "",
    timeStr: "09:00",
    notes: "",
  });

  // ── Dashboard data ──
  const { data, isLoading, isError } = useQuery({
    queryKey: ["radiology-dashboard"],
    queryFn: fetchDashboardData,
    refetchInterval: 30000,
  });

  // ── Booking form data (patients + modalities) — fetched only when modal opens ──
  const { data: formOptions, isLoading: formLoading } = useQuery({
    queryKey: ["radiology-booking-form"],
    queryFn: fetchBookingFormData,
    enabled: isModalOpen, // only fetches when modal is open
  });

  const patients = formOptions?.patients || [];
  const modalities = formOptions?.modalities || [];

  // ── Book appointment mutation ──
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
      setFormData({ patientId: "", modalityId: "", scanName: "", timeStr: "09:00", notes: "" });
      queryClient.invalidateQueries({ queryKey: ["radiology-dashboard"] });
    },
    onError: (err: any) => toast.error(err.message || "Booking failed"),
  });

  const handleBookSubmit = () => {
    if (!formData.patientId || !formData.modalityId || !formData.scanName) {
      return toast.error("Please fill all required fields.");
    }
    const today = new Date();
    const [hours, minutes] = formData.timeStr.split(":");
    const scheduledStart = new Date(today);
    scheduledStart.setHours(parseInt(hours), parseInt(minutes), 0);
    const scheduledEnd = new Date(scheduledStart.getTime() + 30 * 60000);

    bookMutation.mutate({
      ...formData,
      scheduledStart: scheduledStart.toISOString(),
      scheduledEnd: scheduledEnd.toISOString(),
    });
  };

  // ── Loading / error states ──
  if (isLoading) {
    return (
      <div className="h-[calc(100vh-4rem)] flex flex-col items-center justify-center bg-muted/30 font-sans">
        <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
        <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest animate-pulse">
          Loading Dashboard...
        </p>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="h-[calc(100vh-4rem)] flex flex-col items-center justify-center bg-muted/30 font-sans">
        <AlertCircle className="h-12 w-12 text-rose-400 mb-4" />
        <h2 className="text-xl font-bold text-slate-800">Connection Error</h2>
        <p className="text-muted-foreground mb-6 max-w-md text-center">
          Failed to load the radiology dashboard data. Please check your connection or try again.
        </p>
        <Button onClick={() => window.location.reload()} variant="outline">
          Refresh Page
        </Button>
      </div>
    );
  }

  const dynamicStats = [
    { label: "Today's Scans",    value: data?.stats?.scansToday    || 0,       icon: Activity,   color: "text-primary",    bg: "bg-blue-100",    border: "border-primary/20/50"    },
    { label: "Pending Reports",  value: data?.stats?.pendingReports || 0,       icon: FileText,   color: "text-orange-600",  bg: "bg-orange-100",  border: "border-orange-200/50"  },
    { label: "Avg. Turnaround",  value: data?.stats?.avgTat        || "0h 0m",  icon: Clock,      color: "text-purple-600",  bg: "bg-purple-100",  border: "border-purple-200/50"  },
    { label: "Revenue (Today)",  value: data?.stats?.revenueToday  || "₹0",     icon: TrendingUp, color: "text-primary", bg: "bg-emerald-100", border: "border-emerald-200/50" },
  ];

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-muted/30 font-sans relative selection:bg-indigo-100 pb-12">
      {/* Decorative Background Mesh */}
      <div className="absolute top-0 inset-x-0 h-64 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-100/40 via-slate-50 to-transparent pointer-events-none z-0" />

      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10 space-y-8">

        {/* ── HEADER ── */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-card/70 backdrop-blur-xl p-5 rounded-2xl border border-slate-200/60 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-gradient-to-br from-indigo-500 to-primary rounded-xl flex items-center justify-center shadow-inner shrink-0">
              <MonitorPlay className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-foreground tracking-tight leading-tight">
                Radiology Command Center
              </h1>
              <p className="text-sm font-medium text-muted-foreground mt-0.5">
                Monitor modalities, track appointment flow, and manage reporting queues.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 w-full md:w-auto">
            <Button
              variant="outline"
              onClick={() => router.push("/workspace/radiology/appointments")}
              className="w-full md:w-auto bg-card h-11 rounded-xl border-border text-foreground/80 hover:bg-muted/30 font-bold transition-colors"
            >
              <CalendarClock className="h-4 w-4 mr-2 text-indigo-500" />
              View Calendar
            </Button>

            <Button
              id="new-booking-btn"
              onClick={() => setIsModalOpen(true)}
              className="h-11 rounded-xl bg-gradient-to-r from-primary to-primary hover:from-indigo-700 hover:to-violet-700 text-primary-foreground shadow-md shadow-indigo-500/25 w-full md:w-auto font-bold transition-all duration-300 hover:-translate-y-0.5"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Booking
            </Button>
          </div>
        </div>

        {/* ── STATS GRID ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {dynamicStats.map((stat, i) => (
            <Card key={i} className="border-0 shadow-sm rounded-2xl hover:shadow-md transition-shadow bg-card overflow-hidden relative">
              <div className={`absolute top-0 inset-x-0 h-1 ${stat.bg}`} />
              <CardContent className="p-6 flex items-center gap-5">
                <div className={`h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 border ${stat.bg} ${stat.border}`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">{stat.label}</p>
                  <h3 className="text-2xl font-black text-foreground tracking-tight leading-none">{stat.value}</h3>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ── LIVE WORKFLOW PIPELINE ── */}
        <Card className="border-slate-200/80 shadow-sm rounded-2xl bg-card overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-4">
            <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2 uppercase tracking-wider">
              <Activity className="h-4 w-4 text-indigo-500" /> Today's Live Workflow
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-center justify-between w-full">
              {[
                { label: "Scheduled", count: data?.workflow?.scheduled || 0, icon: Calendar,      color: "text-muted-foreground",   bg: "bg-muted"  },
                { label: "Waiting",   count: data?.workflow?.waiting   || 0, icon: Users,         color: "text-amber-600",   bg: "bg-amber-100"  },
                { label: "Scanning",  count: data?.workflow?.scanning  || 0, icon: Activity,      color: "text-primary",    bg: "bg-blue-100"   },
                { label: "Reporting", count: data?.workflow?.reporting || 0, icon: FileText,      color: "text-purple-600",  bg: "bg-purple-100" },
                { label: "Verified",  count: data?.workflow?.verified  || 0, icon: CheckCircle2,  color: "text-primary", bg: "bg-emerald-100"},
              ].map((step, index, array) => (
                <div key={step.label} className="flex items-center w-full md:w-auto">
                  <div className="flex flex-row md:flex-col items-center gap-4 md:gap-2 w-full md:w-32 p-3 md:p-0 rounded-xl hover:bg-muted/30 transition-colors">
                    <div className={`h-12 w-12 rounded-full flex items-center justify-center ${step.bg}`}>
                      <step.icon className={`h-6 w-6 ${step.color}`} />
                    </div>
                    <div className="flex-1 md:text-center">
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-0.5">{step.label}</p>
                      <p className={`text-2xl font-black ${step.count > 0 ? "text-foreground" : "text-slate-300"}`}>
                        {step.count}
                      </p>
                    </div>
                  </div>
                  {index < array.length - 1 && (
                    <div className="hidden md:flex items-center justify-center w-8 text-slate-300">
                      <ChevronRight className="h-6 w-6" />
                    </div>
                  )}
                  {index < array.length - 1 && (
                    <div className="h-4 w-px bg-slate-200 md:hidden my-1 ml-9" />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* ── MAIN SPLIT ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* Modality Fleet */}
          <div className="lg:col-span-8 space-y-6">
            <Card className="border-slate-200/80 shadow-sm rounded-2xl overflow-hidden min-h-[450px] flex flex-col bg-card">
              <CardHeader className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                  <Server className="h-5 w-5 text-indigo-500" /> Modality Fleet Status
                </CardTitle>
                <Link href="/workspace/radiology/modalities" className="text-xs font-bold text-primary hover:text-primary bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors">
                  Manage Assets
                </Link>
              </CardHeader>
              <CardContent className="p-0 flex-1">
                {!data.modalities || data.modalities.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-slate-400">
                    <Server className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p className="font-bold text-muted-foreground">No machines registered</p>
                    <p className="text-xs mt-1">Add modalities to start tracking utilization.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {data.modalities.map((mod: any, i: number) => (
                      <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 p-6 hover:bg-muted/50/50 transition-colors">
                        <div className="w-full sm:w-1/3">
                          <p className="font-bold text-foreground text-base">{mod.name}</p>
                          <div className="flex items-center gap-2 mt-1.5">
                            {mod.status === "ACTIVE" && (
                              <Badge variant="outline" className="bg-emerald-50 text-primary border-none px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Active
                              </Badge>
                            )}
                            {mod.status === "MAINTENANCE" && (
                              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-none px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Maintenance
                              </Badge>
                            )}
                            {mod.status === "INACTIVE" && (
                              <Badge variant="outline" className="bg-muted text-muted-foreground border-none px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                                <span className="h-1.5 w-1.5 rounded-full bg-slate-400" /> Inactive
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="w-full sm:w-1/3 flex flex-col justify-center">
                          <p className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-wider mb-0.5">Current Patient</p>
                          <p className="font-bold text-primary truncate text-sm">
                            {mod.currentPatient && mod.currentPatient !== "-" ? mod.currentPatient : "Idle / Available"}
                          </p>
                          <p className="text-[10px] font-medium text-muted-foreground mt-1 flex items-center gap-1">
                            <Clock className="h-3 w-3" /> Next Slot: <span className="font-bold">{mod.nextSlot || "None"}</span>
                          </p>
                        </div>
                        <div className="w-full sm:w-1/3">
                          <div className="flex justify-between items-end text-xs mb-1.5">
                            <span className="font-bold text-muted-foreground uppercase tracking-wider text-[10px]">Daily Load</span>
                            <span className="font-black text-slate-800">{mod.load || 0}%</span>
                          </div>
                          <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-1000 ${(mod.load || 0) > 80 ? "bg-orange-500" : (mod.load || 0) === 0 ? "bg-slate-300" : "bg-indigo-500"}`}
                              style={{ width: `${mod.load || 0}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Radiologist Queue */}
          <div className="lg:col-span-4 space-y-6">
            <Card className="border-slate-200/80 shadow-sm rounded-2xl overflow-hidden min-h-[450px] flex flex-col bg-card">
              <CardHeader className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex flex-row items-center justify-between space-y-0 shrink-0">
                <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                  <Stethoscope className="h-5 w-5 text-purple-600" /> Pending Queue
                </CardTitle>
                <Badge variant="secondary" className="bg-purple-100 text-purple-700 hover:bg-purple-100 font-mono text-xs font-bold">
                  {data.pendingQueue?.length || 0}
                </Badge>
              </CardHeader>
              <CardContent className="p-0 flex-1 overflow-y-auto custom-scrollbar">
                {!data.pendingQueue || data.pendingQueue.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-muted-foreground/70 p-6 text-center">
                    <CheckCircle2 className="h-12 w-12 mx-auto mb-3 opacity-30 text-emerald-500" />
                    <p className="font-bold text-muted-foreground text-base">Queue is Clear</p>
                    <p className="text-xs mt-1">All scans have been reported by the radiologist.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-50">
                    {data.pendingQueue.map((item: any, i: number) => (
                      <Link href="/workspace/radiology/reporting" key={i} className="block group">
                        <div className="p-5 hover:bg-purple-50/40 transition-colors flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1.5">
                              <span className="text-[9px] font-bold font-mono text-muted-foreground bg-muted border border-border px-1.5 py-0.5 rounded">
                                {item.id || "N/A"}
                              </span>
                              {item.priority === "URGENT" && (
                                <Badge variant="outline" className="bg-red-50 text-red-600 border-none px-1.5 py-0 text-[9px] font-black tracking-wider uppercase flex items-center gap-1 shadow-sm">
                                  <AlertCircle className="h-2.5 w-2.5" /> Urgent
                                </Badge>
                              )}
                            </div>
                            <p className="font-bold text-foreground text-sm truncate">{item.patient || "Unknown Patient"}</p>
                            <p className="text-xs font-medium text-muted-foreground truncate mt-0.5">{item.scan || "Unknown Scan"}</p>
                            <p className="text-[10px] font-bold text-muted-foreground/70 mt-2 uppercase tracking-wider flex items-center gap-1.5">
                              <Clock className="h-3 w-3" /> Scanned: {item.time || "-"}
                            </p>
                          </div>
                          <div className="pl-3 flex items-center justify-center h-full shrink-0">
                            <div className="h-8 w-8 rounded-full bg-card border border-slate-100 shadow-sm flex items-center justify-center text-purple-400 group-hover:bg-purple-600 group-hover:text-primary-foreground group-hover:border-purple-600 transition-all">
                              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
              <div className="p-4 border-t border-slate-100 bg-muted/30 text-center shrink-0">
                <Link href="/workspace/radiology/reporting" className="text-sm font-bold text-purple-600 hover:text-purple-700 flex items-center justify-center gap-1.5 group transition-colors">
                  Open Radiologist Desk <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
            </Card>
          </div>
        </div>
      </main>

      {/* ══════════════════════════════════════════════════════════════════
          BOOK RADIOLOGY SCAN MODAL
          (Identical UI to /workspace/radiology/dashboard/appointments)
         ══════════════════════════════════════════════════════════════════ */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100 flex flex-col max-h-[90vh]">

            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-100 bg-card flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-lg font-bold text-foreground">Book Radiology Scan</h2>
                <p className="text-xs font-medium text-muted-foreground mt-0.5">
                  Scheduling for {format(new Date(), "MMM dd, yyyy")}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsModalOpen(false)}
                className="h-8 w-8 text-muted-foreground/70 hover:text-foreground/80 hover:bg-muted rounded-full"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 overflow-y-auto custom-scrollbar">

              {formLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-indigo-500 mr-3" />
                  <span className="text-sm font-bold text-muted-foreground">Loading patient & modality data...</span>
                </div>
              ) : (
                <>
                  {/* Patient */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-foreground/80 uppercase tracking-wider">
                      Select Patient <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground/70 pointer-events-none" />
                      <select
                        id="modal-patient-select"
                        className="flex h-11 w-full rounded-xl border border-border bg-muted/30 pl-10 pr-4 text-sm font-medium outline-none focus:bg-card focus:ring-2 focus:ring-primary/20 focus:border-indigo-400 transition-all appearance-none cursor-pointer"
                        value={formData.patientId}
                        onChange={(e) => setFormData({ ...formData, patientId: e.target.value })}
                      >
                        <option value="" disabled>-- Choose Registered Patient --</option>
                        {patients.map((p: any) => (
                          <option key={p.id} value={p.id}>{p.name} ({p.phone})</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Modality + Scan Name */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-foreground/80 uppercase tracking-wider">
                        Modality <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative">
                        <Microscope className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground/70 pointer-events-none" />
                        <select
                          id="modal-modality-select"
                          className="flex h-11 w-full rounded-xl border border-border bg-muted/30 pl-10 pr-4 text-sm font-medium outline-none focus:bg-card focus:ring-2 focus:ring-primary/20 focus:border-indigo-400 transition-all appearance-none cursor-pointer"
                          value={formData.modalityId}
                          onChange={(e) => setFormData({ ...formData, modalityId: e.target.value })}
                        >
                          <option value="" disabled>-- Select Machine --</option>
                          {modalities.map((m: any) => (
                            <option key={m.id} value={m.id}>{m.type} ({m.name})</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-foreground/80 uppercase tracking-wider">
                        Scan Name <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="modal-scan-name"
                        placeholder="e.g. MRI Brain with Contrast"
                        value={formData.scanName}
                        onChange={(e) => setFormData({ ...formData, scanName: e.target.value })}
                        className="h-11 rounded-xl bg-muted/30 border-border focus:bg-card focus:ring-primary/20 text-sm font-medium"
                      />
                    </div>
                  </div>

                  {/* Time Slot + Notes */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-foreground/80 uppercase tracking-wider">
                        Time Slot <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative">
                        <Clock className="absolute right-3 top-3.5 h-4 w-4 text-muted-foreground/70 pointer-events-none" />
                        <Input
                          id="modal-time-slot"
                          type="time"
                          value={formData.timeStr}
                          onChange={(e) => setFormData({ ...formData, timeStr: e.target.value })}
                          className="h-11 rounded-xl bg-muted/30 border-border focus:bg-card focus:ring-primary/20 text-sm font-medium pr-10"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-foreground/80 uppercase tracking-wider">
                        Front Desk Notes
                      </Label>
                      <Input
                        id="modal-notes"
                        placeholder="Safety alerts, instructions..."
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        className="h-11 rounded-xl bg-muted/30 border-border focus:bg-card focus:ring-primary/20 text-sm font-medium"
                      />
                    </div>
                  </div>

                  {/* DICOM Info Banner */}
                  <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl text-xs font-medium text-indigo-800 flex gap-3">
                    <AlertCircle className="h-5 w-5 shrink-0 text-indigo-500" />
                    <p className="leading-relaxed">
                      Booking this appointment will automatically generate a DICOM Accession Number and push the order to the{" "}
                      <strong>Modality Worklist (MWL)</strong>.
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-100 bg-muted/30 flex flex-col-reverse sm:flex-row justify-end gap-3 shrink-0">
              <Button
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                className="h-11 rounded-xl font-bold text-muted-foreground bg-card w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                id="modal-confirm-booking"
                onClick={handleBookSubmit}
                disabled={bookMutation.isPending || formLoading}
                className="bg-primary hover:bg-primary/90 text-primary-foreground h-11 rounded-xl font-bold shadow-md shadow-indigo-500/25 w-full sm:w-auto transition-all"
              >
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