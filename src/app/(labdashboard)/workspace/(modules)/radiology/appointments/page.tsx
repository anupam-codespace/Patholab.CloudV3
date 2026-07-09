"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  CalendarDays,
  Search,
  Plus,
  Clock,
  User,
  Activity,
  CheckCircle2,
  PlayCircle,
  MoreVertical,
  Filter,
  Loader2,
  Calendar as CalendarIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

export default function ScanSchedulePage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeModality, setActiveModality] = useState("ALL");

  // 1. Fetch Appointments Data
  const { data: rawData, isLoading } = useQuery({
    queryKey: ["radiology-appointments"],
    queryFn: async () => {
      const res = await fetch("/api/workspace/radiology/appointments");
      if (!res.ok) {
        // Fallback mock data if API doesn't exist or fails
        return [
          { id: "APT-001", patient: "Amit Kumar", age: "54 Y", gender: "M", time: "09:00 AM", modality: "MRI", scan: "MRI Brain", status: "SCHEDULED" },
          { id: "APT-002", patient: "Priya Sharma", age: "32 Y", gender: "F", time: "09:45 AM", modality: "USG", scan: "USG Whole Abdomen", status: "ARRIVED" },
          { id: "APT-003", patient: "Rahul Singh", age: "41 Y", gender: "M", time: "10:30 AM", modality: "CT", scan: "HRCT Chest", status: "SCANNING" },
          { id: "APT-004", patient: "Sneha Patel", age: "28 Y", gender: "F", time: "11:15 AM", modality: "X-RAY", scan: "X-Ray Chest PA", status: "COMPLETED" },
        ];
      }
      return res.json();
    },
    refetchInterval: 30000, 
  });

  // ✅ THE NUCLEAR FIX: Strictly enforce an Array format no matter what the API returns & normalize records
  const getSafeAppointments = (data: any) => {
    let arr: any[] = [];
    if (!data) arr = [];
    else if (Array.isArray(data)) arr = data;
    else if (Array.isArray(data.data)) arr = data.data;
    else if (Array.isArray(data.appointments)) arr = data.appointments;
    
    return arr.map((apt: any) => {
      let patientName = "Unknown Patient";
      let ageStr = "N/A";
      let genderStr = "N/A";
      
      if (typeof apt.patient === "string") {
        patientName = apt.patient;
        ageStr = apt.age || "N/A";
        genderStr = apt.gender || "N/A";
      } else if (apt.patient && typeof apt.patient === "object") {
        patientName = apt.patient.name || "Unknown Patient";
        if (apt.patient.age !== undefined && apt.patient.age !== null) {
          const unitChar = apt.patient.ageUnit ? apt.patient.ageUnit.charAt(0) : "Y";
          ageStr = `${apt.patient.age} ${unitChar}`;
        }
        genderStr = apt.patient.gender ? apt.patient.gender.charAt(0) : "N/A";
      }

      let timeStr = apt.time;
      if (!timeStr && apt.scheduledStart) {
        try {
          timeStr = format(new Date(apt.scheduledStart), "hh:mm a");
        } catch (e) {
          timeStr = "Unknown";
        }
      }

      let modalityStr = "N/A";
      if (typeof apt.modality === "string") {
        modalityStr = apt.modality;
      } else if (apt.modality && typeof apt.modality === "object") {
        modalityStr = apt.modality.type || apt.modality.name || "N/A";
      }

      let scanStr = apt.scan || apt.scanName || "N/A";

      return {
        ...apt,
        patient: patientName,
        age: ageStr,
        gender: genderStr,
        time: timeStr,
        modality: modalityStr,
        scan: scanStr
      };
    });
  };

  const safeAppointments = getSafeAppointments(rawData);

  // 2. Status Update Mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string, status: string }) => {
      const res = await fetch(`/api/workspace/radiology/appointments`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointmentId: id, status }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Status updated!");
      queryClient.invalidateQueries({ queryKey: ["radiology-appointments"] });
    },
    onError: () => toast.error("Failed to update status"),
  });

  // Filter Logic (Using the guaranteed safe array)
  const filteredAppointments = safeAppointments.filter((apt: any) => {
    const pName = apt?.patient || "";
    const pId = apt?.id || "";
    const matchesSearch = pName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          pId.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesModality = activeModality === "ALL" || apt?.modality === activeModality;
    return matchesSearch && matchesModality;
  })
  
  // 🚀 ADD THIS SORTING LOGIC
  .sort((a: any, b: any) => {
    return new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime();
  });

  // KPIs
  const arrivedCount = safeAppointments.filter((a: any) => a?.status === "ARRIVED").length;
  const scanningCount = safeAppointments.filter((a: any) => a?.status === "SCANNING").length;
  const completedCount = safeAppointments.filter((a: any) => a?.status === "COMPLETED").length;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 font-sans relative selection:bg-indigo-100 pb-12">
      <div className="absolute top-0 inset-x-0 h-64 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-100/40 via-slate-50 to-transparent pointer-events-none z-0" />

      {/* HEADER */}
      <header className="sticky top-0 z-30 bg-white/70 backdrop-blur-xl border-b border-slate-200/60 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center shadow-inner shrink-0">
              <CalendarDays className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight leading-tight">Scan Schedule & Triage</h1>
              <p className="text-xs font-medium text-slate-500 mt-0.5">Manage patient flow, machine allocation, and daily appointments.</p>
            </div>
          </div>
          {/* THE FIXED BUTTON */}
          <Button 
            onClick={() => router.push('/workspace/radiology/dashboard/appointments')}
            className="h-10 bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-sm w-full md:w-auto"
          >
            <Plus className="w-4 h-4 mr-2" /> Book Scan
          </Button>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10 space-y-6">
        
        {/* STATS ROW */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-0 shadow-sm rounded-2xl bg-white overflow-hidden">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-slate-100 flex items-center justify-center"><CalendarIcon className="h-5 w-5 text-slate-600" /></div>
              <div><p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Today</p><h3 className="text-xl font-black text-slate-900">{safeAppointments.length}</h3></div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm rounded-2xl bg-white overflow-hidden">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-amber-50 flex items-center justify-center"><User className="h-5 w-5 text-amber-600" /></div>
              <div><p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Waiting / Arrived</p><h3 className="text-xl font-black text-slate-900">{arrivedCount}</h3></div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm rounded-2xl bg-white overflow-hidden">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-rose-50 flex items-center justify-center"><Activity className="h-5 w-5 text-rose-600 animate-pulse" /></div>
              <div><p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Currently Scanning</p><h3 className="text-xl font-black text-slate-900">{scanningCount}</h3></div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm rounded-2xl bg-white overflow-hidden">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-emerald-50 flex items-center justify-center"><CheckCircle2 className="h-5 w-5 text-emerald-600" /></div>
              <div><p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Completed Scans</p><h3 className="text-xl font-black text-slate-900">{completedCount}</h3></div>
            </CardContent>
          </Card>
        </div>

        {/* MAIN LAYOUT: FILTERS & TABLE */}
        <div className="flex flex-col lg:flex-row gap-6">
          
          {/* Left Sidebar: Filters */}
          <div className="w-full lg:w-64 shrink-0 space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4">
              <div className="flex items-center gap-2 mb-4 text-slate-700 font-bold text-sm">
                <Filter className="h-4 w-4" /> Modality Filter
              </div>
              <div className="flex flex-col gap-1.5">
                {["ALL", "MRI", "CT", "X-RAY", "USG", "PET"].map(mod => (
                  <button 
                    key={mod}
                    onClick={() => setActiveModality(mod)}
                    className={`text-left px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                      activeModality === mod ? "bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-100" : "text-slate-600 hover:bg-slate-50 border border-transparent"
                    }`}>
                    {mod === "ALL" ? "All Modalities" : `${mod} Scans`}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Main: Appointment List */}
          <div className="flex-1 bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50">
              <div className="relative max-w-md w-full">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input 
                  placeholder="Search patient name or ID..." 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-9 h-10 bg-white border-slate-200 rounded-xl shadow-sm text-sm" 
                />
              </div>
            </div>

            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50/80 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200/80">
                  <tr>
                    <th className="px-6 py-4">Time</th>
                    <th className="px-6 py-4">Patient Details</th>
                    <th className="px-6 py-4">Modality & Scan</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAppointments.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-20 text-center text-slate-400">
                        <CalendarIcon className="h-10 w-10 mx-auto mb-3 opacity-30" />
                        <p className="font-bold">No appointments found.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredAppointments.map((apt: any) => (
                      <tr key={apt.id} className="hover:bg-slate-50/80 transition-colors group">
                        <td className="px-6 py-4">
                          <span className="font-bold text-slate-700 flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-slate-400"/> {apt.time}</span>
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-bold text-slate-900 text-sm">{apt.patient || "Unknown Patient"}</p>
                          <p className="text-[10px] font-medium text-slate-500 mt-0.5">{apt.id} • {apt.age || "N/A"} / {apt.gender || "N/A"}</p>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[9px] font-bold bg-slate-50">{apt.modality || "N/A"}</Badge>
                            <span className="text-xs font-semibold text-slate-700">{apt.scan || "N/A"}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant="outline" className={`text-[9px] font-bold uppercase tracking-wider border shadow-sm ${
                            apt.status === 'SCHEDULED' ? 'bg-slate-50 text-slate-600 border-slate-200' :
                            apt.status === 'ARRIVED' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                            apt.status === 'SCANNING' ? 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse' :
                            'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}>
                            {apt.status || "UNKNOWN"}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity">
                            {apt.status === "SCHEDULED" && (
                              <Button size="sm" onClick={() => updateStatusMutation.mutate({ id: apt.id, status: "ARRIVED" })} className="h-7 text-[10px] font-bold bg-amber-100 hover:bg-amber-200 text-amber-700">Mark Arrived</Button>
                            )}
                            {apt.status === "ARRIVED" && (
                              <Button size="sm" onClick={() => updateStatusMutation.mutate({ id: apt.id, status: "SCANNING" })} className="h-7 text-[10px] font-bold bg-rose-100 hover:bg-rose-200 text-rose-700"><PlayCircle className="h-3 w-3 mr-1"/> Start Scan</Button>
                            )}
                            {apt.status === "SCANNING" && (
                              <Button size="sm" onClick={() => updateStatusMutation.mutate({ id: apt.id, status: "COMPLETED" })} className="h-7 text-[10px] font-bold bg-emerald-100 hover:bg-emerald-200 text-emerald-700"><CheckCircle2 className="h-3 w-3 mr-1"/> Finish</Button>
                            )}
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-slate-700"><MoreVertical className="h-4 w-4" /></Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}