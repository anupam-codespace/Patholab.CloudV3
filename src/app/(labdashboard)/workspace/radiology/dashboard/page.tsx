"use client";

import { useQuery } from "@tanstack/react-query";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

// Fetch function for React Query
const fetchDashboardData = async () => {
  const res = await fetch("/api/workspace/radiology/dashboard");
  if (!res.ok) throw new Error("Failed to fetch data");
  return res.json();
};

export default function RisDashboard() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["radiology-dashboard"],
    queryFn: fetchDashboardData,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (isLoading) {
    return (
      <div className="h-[calc(100vh-4rem)] flex flex-col items-center justify-center bg-slate-50 font-sans">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-600 mb-4" />
        <p className="text-sm font-bold text-slate-500 uppercase tracking-widest animate-pulse">
          Loading Dashboard...
        </p>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="h-[calc(100vh-4rem)] flex flex-col items-center justify-center bg-slate-50 font-sans">
        <AlertCircle className="h-12 w-12 text-rose-400 mb-4" />
        <h2 className="text-xl font-bold text-slate-800">Connection Error</h2>
        <p className="text-slate-500 mb-6 max-w-md text-center">
          Failed to load the radiology dashboard data. Please check your
          connection or try again.
        </p>
        <Button onClick={() => window.location.reload()} variant="outline">
          Refresh Page
        </Button>
      </div>
    );
  }

  // Dynamic Stats array using real data, with fallback to 0 or "N/A" if properties are missing
  const dynamicStats = [
    {
      label: "Today's Scans",
      value: data?.stats?.scansToday || 0,
      icon: Activity,
      color: "text-blue-600",
      bg: "bg-blue-100",
      border: "border-blue-200/50",
    },
    {
      label: "Pending Reports",
      value: data?.stats?.pendingReports || 0,
      icon: FileText,
      color: "text-orange-600",
      bg: "bg-orange-100",
      border: "border-orange-200/50",
    },
    {
      label: "Avg. Turnaround",
      value: data?.stats?.avgTat || "0h 0m",
      icon: Clock,
      color: "text-purple-600",
      bg: "bg-purple-100",
      border: "border-purple-200/50",
    },
    {
      label: "Revenue (Today)",
      value: data?.stats?.revenueToday || "₹0",
      icon: TrendingUp,
      color: "text-emerald-600",
      bg: "bg-emerald-100",
      border: "border-emerald-200/50",
    },
  ];

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 font-sans relative selection:bg-indigo-100 pb-12">
      {/* Decorative Background Mesh */}
      <div className="absolute top-0 inset-x-0 h-64 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-100/40 via-slate-50 to-transparent pointer-events-none z-0" />

      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10 space-y-8">
        {/* HEADER SECTION */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white/70 backdrop-blur-xl p-5 rounded-2xl border border-slate-200/60 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center shadow-inner shrink-0">
              <MonitorPlay className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight leading-tight">
                Radiology Command Center
              </h1>
              <p className="text-sm font-medium text-slate-500 mt-0.5">
                Monitor modalities, track appointment flow, and manage reporting
                queues.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 w-full md:w-auto">
            <Link
              href="/workspace/radiology/appointments"
              className="flex-1 md:flex-none">
              <Button
                variant="outline"
                className="w-full bg-white h-11 rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 font-bold transition-colors">
                <CalendarClock className="h-4 w-4 mr-2 text-indigo-500" /> View
                Calendar
              </Button>
            </Link>
            <Link
              href="/workspace/radiology/appointments"
              className="flex-1 md:flex-none">
              <Button className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-md shadow-indigo-500/25 h-11 rounded-xl font-bold transition-all duration-300 hover:-translate-y-0.5">
                <Plus className="h-5 w-5 mr-1" /> New Booking
              </Button>
            </Link>
          </div>
        </div>

        {/* STATS GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {dynamicStats.map((stat, i) => (
            <Card
              key={i}
              className={`border-0 shadow-sm rounded-2xl hover:shadow-md transition-shadow bg-white overflow-hidden relative`}>
              <div className={`absolute top-0 inset-x-0 h-1 ${stat.bg}`} />
              <CardContent className="p-6 flex items-center gap-5">
                <div
                  className={`h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 border ${stat.bg} ${stat.border}`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                    {stat.label}
                  </p>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-none">
                    {stat.value}
                  </h3>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* MAIN DASHBOARD SPLIT */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* LEFT COLUMN: Modality Status (Spans 8) */}
          <div className="lg:col-span-8 space-y-6">
            <Card className="border-slate-200/80 shadow-sm rounded-2xl overflow-hidden min-h-[450px] flex flex-col bg-white">
              <CardHeader className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <Server className="h-5 w-5 text-indigo-500" /> Modality Status
                  Fleet
                </CardTitle>
                <Link
                  href="/workspace/radiology/modalities"
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors">
                  Manage Assets
                </Link>
              </CardHeader>

              <CardContent className="p-0 flex-1">
                {!data.modalities || data.modalities.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-slate-400">
                    <Server className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p className="font-bold text-slate-600">
                      No machines registered
                    </p>
                    <p className="text-xs mt-1">
                      Add modalities to start tracking utilization.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {data.modalities.map((mod: any, i: number) => (
                      <div
                        key={i}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 p-6 hover:bg-slate-50/50 transition-colors">
                        {/* Machine Name & Status */}
                        <div className="w-full sm:w-1/3">
                          <p className="font-bold text-slate-900 text-base">
                            {mod.name}
                          </p>
                          <div className="flex items-center gap-2 mt-1.5">
                            {mod.status === "ACTIVE" && (
                              <Badge
                                variant="outline"
                                className="bg-emerald-50 text-emerald-700 border-none px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>{" "}
                                Active
                              </Badge>
                            )}
                            {mod.status === "MAINTENANCE" && (
                              <Badge
                                variant="outline"
                                className="bg-amber-50 text-amber-700 border-none px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                                <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>{" "}
                                Maintenance
                              </Badge>
                            )}
                            {mod.status === "INACTIVE" && (
                              <Badge
                                variant="outline"
                                className="bg-slate-100 text-slate-600 border-none px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                                <span className="h-1.5 w-1.5 rounded-full bg-slate-400"></span>{" "}
                                Inactive
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Current & Next Patient */}
                        <div className="w-full sm:w-1/3 flex flex-col justify-center">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                            Current Patient
                          </p>
                          <p className="font-bold text-indigo-700 truncate text-sm">
                            {mod.currentPatient && mod.currentPatient !== "-"
                              ? mod.currentPatient
                              : "Idle / Available"}
                          </p>
                          <p className="text-[10px] font-medium text-slate-500 mt-1 flex items-center gap-1">
                            <Clock className="h-3 w-3" /> Next Slot:{" "}
                            <span className="font-bold">
                              {mod.nextSlot || "None"}
                            </span>
                          </p>
                        </div>

                        {/* Utilization Bar */}
                        <div className="w-full sm:w-1/3">
                          <div className="flex justify-between items-end text-xs mb-1.5">
                            <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">
                              Daily Load
                            </span>
                            <span className="font-black text-slate-800">
                              {mod.load || 0}%
                            </span>
                          </div>
                          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-1000 ${
                                (mod.load || 0) > 80
                                  ? "bg-orange-500"
                                  : (mod.load || 0) === 0
                                    ? "bg-slate-300"
                                    : "bg-indigo-500"
                              }`}
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

          {/* RIGHT COLUMN: Radiologist Queue (Spans 4) */}
          <div className="lg:col-span-4 space-y-6">
            <Card className="border-slate-200/80 shadow-sm rounded-2xl overflow-hidden min-h-[450px] flex flex-col bg-white">
              <CardHeader className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex flex-row items-center justify-between space-y-0 shrink-0">
                <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <Stethoscope className="h-5 w-5 text-purple-600" /> Pending
                  Queue
                </CardTitle>
                <Badge
                  variant="secondary"
                  className="bg-purple-100 text-purple-700 hover:bg-purple-100 font-mono text-xs font-bold">
                  {data.pendingQueue?.length || 0}
                </Badge>
              </CardHeader>

              <CardContent className="p-0 flex-1 overflow-y-auto custom-scrollbar">
                {!data.pendingQueue || data.pendingQueue.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-slate-400 p-6 text-center">
                    <CheckCircle2 className="h-12 w-12 mx-auto mb-3 opacity-30 text-emerald-500" />
                    <p className="font-bold text-slate-600 text-base">
                      Queue is Clear
                    </p>
                    <p className="text-xs mt-1">
                      All scans have been reported by the radiologist.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-50">
                    {data.pendingQueue.map((item: any, i: number) => (
                      <Link
                        href="/workspace/radiology/reporting"
                        key={i}
                        className="block group">
                        <div className="p-5 hover:bg-purple-50/40 transition-colors flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1.5">
                              <span className="text-[9px] font-bold font-mono text-slate-500 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">
                                {item.id || "N/A"}
                              </span>
                              {item.priority === "URGENT" && (
                                <Badge
                                  variant="outline"
                                  className="bg-red-50 text-red-600 border-none px-1.5 py-0 text-[9px] font-black tracking-wider uppercase flex items-center gap-1 shadow-sm">
                                  <AlertCircle className="h-2.5 w-2.5" /> Urgent
                                </Badge>
                              )}
                            </div>
                            <p className="font-bold text-slate-900 text-sm truncate">
                              {item.patient || "Unknown Patient"}
                            </p>
                            <p className="text-xs font-medium text-slate-600 truncate mt-0.5">
                              {item.scan || "Unknown Scan"}
                            </p>
                            <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-wider flex items-center gap-1.5">
                              <Clock className="h-3 w-3" /> Scanned:{" "}
                              {item.time || "-"}
                            </p>
                          </div>

                          <div className="pl-3 flex items-center justify-center h-full shrink-0">
                            <div className="h-8 w-8 rounded-full bg-white border border-slate-100 shadow-sm flex items-center justify-center text-purple-400 group-hover:bg-purple-600 group-hover:text-white group-hover:border-purple-600 transition-all">
                              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>

              {/* Sticky Footer Link */}
              <div className="p-4 border-t border-slate-100 bg-slate-50 text-center shrink-0">
                <Link
                  href="/workspace/radiology/reporting"
                  className="text-sm font-bold text-purple-600 hover:text-purple-700 flex items-center justify-center gap-1.5 group transition-colors">
                  Open Radiologist Desk{" "}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
