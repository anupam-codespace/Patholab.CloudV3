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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

// Fetch function for React Query
const fetchDashboardData = async () => {
  const res = await fetch("/api/lab-owner/radiology/dashboard");
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
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="p-10 text-center text-red-500">
        Failed to load dashboard data.
      </div>
    );
  }

  // Dynamic Stats array using real data
  const dynamicStats = [
    {
      label: "Today's Scans",
      value: data.stats.scansToday,
      icon: Activity,
      color: "text-blue-600",
      bg: "bg-blue-100",
    },
    {
      label: "Pending Reports",
      value: data.stats.pendingReports,
      icon: FileText,
      color: "text-orange-600",
      bg: "bg-orange-100",
    },
    {
      label: "Avg. TAT",
      value: data.stats.avgTat,
      icon: Clock,
      color: "text-purple-600",
      bg: "bg-purple-100",
    },
    {
      label: "Revenue (Today)",
      value: data.stats.revenueToday,
      icon: TrendingUp,
      color: "text-emerald-600",
      bg: "bg-emerald-100",
    },
  ];

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Radiology Overview
          </h1>
          <p className="text-sm text-slate-500">
            Monitor modalities, appointments, and reporting queues.
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/lab-owner/radiology/appointments">
            <Button variant="outline" className="bg-white">
              <CalendarClock className="h-4 w-4 mr-2" /> View Calendar
            </Button>
          </Link>
          <Link href="/lab-owner/radiology/appointments">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-md">
              + New Appointment
            </Button>
          </Link>
        </div>
      </div>

      {/* STATS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {dynamicStats.map((stat, i) => (
          <div
            key={i}
            className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className={`p-3 rounded-lg ${stat.bg}`}>
              <stat.icon className={`h-6 w-6 ${stat.color}`} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">{stat.label}</p>
              <h3 className="text-2xl font-bold text-slate-900">
                {stat.value}
              </h3>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN: Modality Status */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden min-h-[400px]">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <MonitorPlay className="h-5 w-5 text-blue-600" /> Machine Status
                (Modalities)
              </h2>
              <Link
                href="/lab-owner/radiology/modalities"
                className="text-sm text-blue-600 font-medium hover:underline">
                Manage Assets
              </Link>
            </div>

            <div className="p-6">
              {data.modalities.length === 0 ? (
                <div className="text-center py-10 text-slate-400">
                  <Server className="h-10 w-10 mx-auto mb-2 opacity-20" />
                  <p>No machines registered yet.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {data.modalities.map((mod: any, i: number) => (
                    <div
                      key={i}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-50 pb-4 last:border-0 last:pb-0">
                      <div className="w-1/3">
                        <p className="font-bold text-slate-900">{mod.name}</p>
                        <div className="flex items-center gap-1.5 mt-1">
                          {mod.status === "ACTIVE" && (
                            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                          )}
                          {mod.status === "MAINTENANCE" && (
                            <span className="h-2 w-2 rounded-full bg-amber-500"></span>
                          )}
                          {mod.status === "INACTIVE" && (
                            <span className="h-2 w-2 rounded-full bg-slate-300"></span>
                          )}
                          <span className="text-[10px] font-bold text-slate-500 uppercase">
                            {mod.status}
                          </span>
                        </div>
                      </div>

                      <div className="w-1/3 text-sm">
                        <p className="text-slate-500 text-xs">Current / Next</p>
                        <p className="font-bold text-blue-700 truncate">
                          {mod.currentPatient !== "-"
                            ? mod.currentPatient
                            : "Idle"}
                        </p>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          Next: {mod.nextSlot}
                        </p>
                      </div>

                      <div className="w-1/3">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-slate-500">Daily Load</span>
                          <span className="font-bold text-slate-700">
                            {mod.load}%
                          </span>
                        </div>
                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${mod.load > 80 ? "bg-orange-500" : mod.load === 0 ? "bg-slate-300" : "bg-blue-500"}`}
                            style={{ width: `${mod.load}%` }}></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Radiologist Queue */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden h-full min-h-[400px] flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Stethoscope className="h-5 w-5 text-purple-600" /> Reporting
                Queue
              </h2>
            </div>

            <div className="p-0 flex-1 overflow-y-auto">
              {data.pendingQueue.length === 0 ? (
                <div className="text-center py-10 text-slate-400">
                  <CheckCircle2 className="h-10 w-10 mx-auto mb-2 opacity-20 text-emerald-500" />
                  <p>All scans reported. Queue is clear.</p>
                </div>
              ) : (
                data.pendingQueue.map((item: any, i: number) => (
                  <Link href="/lab-owner/radiology/reporting" key={i}>
                    <div className="px-6 py-4 border-b border-slate-50 hover:bg-purple-50/50 transition-colors flex items-start justify-between group cursor-pointer">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                            {item.id}
                          </span>
                          {item.priority === "URGENT" && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-600 flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" /> URGENT
                            </span>
                          )}
                        </div>
                        <p className="font-bold text-slate-900">
                          {item.patient}
                        </p>
                        <p className="text-xs font-medium text-slate-600">
                          {item.scan}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-1">
                          Scanned: {item.time}
                        </p>
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
                        <div className="h-8 w-8 rounded-full bg-white shadow-sm flex items-center justify-center text-purple-600">
                          <ArrowRight className="h-4 w-4" />
                        </div>
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50/50 text-center shrink-0">
              <Link
                href="/lab-owner/radiology/reporting"
                className="text-sm font-bold text-purple-600 hover:text-purple-700 hover:underline flex items-center justify-center gap-1">
                Open Radiologist Desk <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
