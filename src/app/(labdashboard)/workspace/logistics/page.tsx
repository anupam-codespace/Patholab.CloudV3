"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Map,
  Truck,
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Navigation,
  BatteryMedium,
  Thermometer,
  Search,
  Filter,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import toast from "react-hot-toast";

// --- API FETCHER ---
const fetchLogisticsData = async () => {
  const res = await fetch("/api/workspace/logistics");
  if (!res.ok) throw new Error("Failed to fetch logistics data");
  return res.json();
};

export default function LogisticsPage() {
  const [activeTab, setActiveTab] = useState<"DISPATCH" | "MAP">("DISPATCH");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTask, setSelectedTask] = useState<any | null>(null);

  // FILTER STATES
  const [staffFilter, setStaffFilter] = useState<"ALL" | "AVAILABLE" | "BUSY">(
    "ALL",
  );
  const [showFilterMenu, setShowFilterMenu] = useState(false);

  // FETCH REAL DATA
  const { data, isLoading, error } = useQuery({
    queryKey: ["logistics"],
    queryFn: fetchLogisticsData,
    refetchInterval: 30000, // Auto-refresh every 30s since dispatch is time-sensitive
  });

  const handleAssignTask = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success(
      "Rider Assignment logic needs a PUT mutation linked to HomeCollectionTrip.",
    );
    setSelectedTask(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs animate-pulse">
          Syncing Dispatch Control...
        </p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center text-rose-500">
        <AlertCircle className="h-10 w-10 mb-2" />
        <p className="font-bold">
          Failed to load dispatch data. Check API connection.
        </p>
      </div>
    );
  }

  const { fleet, tasks } = data;

  // Filter tasks based on search
  const filteredTasks = tasks.filter(
    (t: any) =>
      t.client.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.address.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // Filter fleet based on selected filter dropdown
  const filteredFleet = fleet.filter((rider: any) => {
    if (staffFilter === "ALL") return true;
    if (staffFilter === "AVAILABLE") return rider.status === "AVAILABLE";
    if (staffFilter === "BUSY")
      return rider.status !== "AVAILABLE" && rider.status !== "OFF_DUTY";
    return true;
  });

  return (
    <div className="min-h-screen bg-zinc-50/80 pb-20">
      {/* 1. FLUID DARK HEADER BLOCK */}
      <div className="bg-zinc-950 pt-8 pb-20 lg:pt-12 lg:pb-28 px-4 md:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-5 lg:gap-6 animate-in fade-in duration-500">
          <div className="space-y-1.5 text-white w-full md:w-auto">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight flex items-center gap-2.5 lg:gap-3">
              <Navigation className="h-7 w-7 sm:h-8 sm:w-8 lg:h-10 lg:w-10 text-indigo-400 shrink-0" />
              Dispatch Control
            </h1>
            <p className="text-zinc-400 text-sm sm:text-base lg:text-lg max-w-xl">
              Live fleet tracking and intelligent task routing.
            </p>
          </div>

          <div className="flex bg-zinc-900 p-1 rounded-xl border border-zinc-800 w-full md:w-auto shrink-0 mt-2 md:mt-0">
            <button
              onClick={() => setActiveTab("DISPATCH")}
              className={`flex-1 md:flex-none px-6 py-2.5 text-sm font-bold rounded-lg transition-all ${activeTab === "DISPATCH" ? "bg-zinc-800 text-primary-foreground shadow-md" : "text-zinc-500 hover:text-zinc-300"}`}>
              Queue & Fleet
            </button>
            <button
              onClick={() => setActiveTab("MAP")}
              className={`flex-1 md:flex-none px-6 py-2.5 text-sm font-bold rounded-lg transition-all ${activeTab === "MAP" ? "bg-zinc-800 text-primary-foreground shadow-md" : "text-zinc-500 hover:text-zinc-300"}`}>
              Live Map
            </button>
          </div>
        </div>
      </div>

      {/* 2. OVERLAPPING CONTENT CONTAINER */}
      <div className="relative z-10 px-4 md:px-6 lg:px-8 max-w-7xl mx-auto space-y-6 lg:space-y-8 -mt-10 lg:-mt-14 animate-in slide-in-from-bottom-4 duration-500 delay-150 fill-mode-both">
        {/* --- STATS RIBBON --- */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          <div className="bg-card p-5 rounded-2xl border border-zinc-200 shadow-sm flex flex-col">
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">
              Total Staff
            </p>
            <div className="flex items-end justify-between mt-auto">
              <h3 className="text-3xl font-black text-zinc-900">
                {fleet.length}
              </h3>
              <Truck className="h-6 w-6 text-primary mb-1" />
            </div>
          </div>
          <div className="bg-card p-5 rounded-2xl border border-zinc-200 shadow-sm flex flex-col">
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">
              Active Trips
            </p>
            <div className="flex items-end justify-between mt-auto">
              <h3 className="text-3xl font-black text-rose-600">
                {tasks.length}
              </h3>
              <AlertCircle className="h-6 w-6 text-rose-500 mb-1" />
            </div>
          </div>
          <div className="bg-card p-5 rounded-2xl border border-zinc-200 shadow-sm flex flex-col">
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">
              En Route
            </p>
            <div className="flex items-end justify-between mt-auto">
              <h3 className="text-3xl font-black text-zinc-900">
                {tasks.filter((t: any) => t.status === "IN_PROGRESS").length}
              </h3>
              <Map className="h-6 w-6 text-blue-500 mb-1" />
            </div>
          </div>
          <div className="bg-card p-5 rounded-2xl border border-zinc-200 shadow-sm flex flex-col">
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">
              Completed
            </p>
            <div className="flex items-end justify-between mt-auto">
              <h3 className="text-3xl font-black text-zinc-900">0</h3>
              <CheckCircle2 className="h-6 w-6 text-emerald-500 mb-1" />
            </div>
          </div>
        </div>

        {activeTab === "DISPATCH" ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
            {/* LEFT COLUMN: PENDING TASKS */}
            <div className="lg:col-span-7 xl:col-span-8 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h2 className="text-xl font-black text-zinc-900 tracking-tight">
                  Active Dispatches
                </h2>
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search address or client..."
                    className="w-full pl-9 pr-4 py-2.5 bg-card border border-zinc-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                  />
                </div>
              </div>

              <div className="space-y-4">
                {filteredTasks.length === 0 ? (
                  <div className="bg-card rounded-2xl border-2 border-dashed border-zinc-200 p-12 text-center text-zinc-400 font-bold">
                    No active collection trips found in database.
                  </div>
                ) : (
                  filteredTasks.map((task: any) => (
                    <div
                      key={task.id}
                      className="bg-card rounded-2xl border border-zinc-200 p-5 lg:p-6 shadow-sm hover:border-indigo-200 hover:shadow-md transition-all group flex flex-col sm:flex-row gap-5">
                      <div className="flex-1 space-y-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-1.5">
                              <span
                                className={`px-2.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest ${task.type === "HOME_COLLECTION" ? "bg-violet-50 text-violet-700" : "bg-primary/10 text-primary"}`}>
                                {task.type.replace("_", " ")}
                              </span>
                              <span className="text-xs font-mono font-bold text-zinc-400">
                                TRIP #{task.id}
                              </span>
                            </div>
                            <h3 className="text-lg font-bold text-zinc-900">
                              {task.client}
                            </h3>
                            <p className="text-xs font-bold text-indigo-500 mt-1">
                              Assigned: {task.assignedTo}
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                          <div className="flex items-start gap-2 text-zinc-600">
                            <MapPin className="h-4 w-4 text-zinc-400 shrink-0 mt-0.5" />
                            <span className="font-medium leading-tight">
                              {task.address}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-zinc-600">
                            <Clock className="h-4 w-4 text-zinc-400 shrink-0" />
                            <span className="font-bold text-zinc-800">
                              {task.timeWindow}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 pt-2">
                          {task.requirements.map((req: string, i: number) => (
                            <span
                              key={i}
                              className="flex items-center gap-1.5 bg-zinc-100 text-zinc-600 px-2.5 py-1 rounded-md text-xs font-medium border border-zinc-200/50">
                              <Thermometer className="h-3 w-3" /> {req}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="flex flex-col justify-end sm:w-40 border-t sm:border-t-0 sm:border-l border-zinc-100 pt-4 sm:pt-0 sm:pl-5 shrink-0">
                        <Button
                          onClick={() => setSelectedTask(task)}
                          className="w-full bg-zinc-900 hover:bg-zinc-800 text-primary-foreground font-bold rounded-xl h-11 shadow-md shadow-zinc-200">
                          Modify Assignment
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* RIGHT COLUMN: FLEET STATUS */}
            <div className="lg:col-span-5 xl:col-span-4 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-black text-zinc-900 tracking-tight">
                  Registered Staff
                </h2>
                <div className="relative">
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`h-8 w-8 rounded-lg relative ${staffFilter !== "ALL" ? "text-primary bg-indigo-50" : "text-zinc-400 hover:text-zinc-900"}`}
                    onClick={() => setShowFilterMenu(!showFilterMenu)}>
                    <Filter className="h-4 w-4" />
                    {staffFilter !== "ALL" && (
                      <span className="absolute top-1 right-1 h-1.5 w-1.5 bg-primary rounded-full"></span>
                    )}
                  </Button>

                  {/* CUSTOM FILTER DROPDOWN */}
                  {showFilterMenu && (
                    <div className="absolute right-0 mt-2 w-48 bg-card border border-zinc-200 rounded-xl shadow-xl z-50 p-1.5 animate-in fade-in zoom-in-95 duration-200">
                      <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-3 py-2 border-b border-zinc-100 mb-1">
                        Filter Staff By
                      </p>
                      <button
                        onClick={() => {
                          setStaffFilter("ALL");
                          setShowFilterMenu(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors ${staffFilter === "ALL" ? "bg-zinc-100 font-bold text-zinc-900" : "hover:bg-zinc-50 text-zinc-600 font-medium"}`}>
                        All Staff
                      </button>
                      <button
                        onClick={() => {
                          setStaffFilter("AVAILABLE");
                          setShowFilterMenu(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors ${staffFilter === "AVAILABLE" ? "bg-emerald-50 font-bold text-primary" : "hover:bg-zinc-50 text-zinc-600 font-medium"}`}>
                        Available Only
                      </button>
                      <button
                        onClick={() => {
                          setStaffFilter("BUSY");
                          setShowFilterMenu(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors ${staffFilter === "BUSY" ? "bg-indigo-50 font-bold text-primary" : "hover:bg-zinc-50 text-zinc-600 font-medium"}`}>
                        Busy / On Trip
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-card rounded-3xl border border-zinc-200 shadow-sm overflow-hidden flex flex-col h-[600px]">
                <div className="overflow-y-auto p-2">
                  {filteredFleet.length === 0 ? (
                    <div className="p-8 text-center text-sm font-medium text-zinc-400">
                      {staffFilter === "ALL"
                        ? "No staff members mapped to this lab in the database."
                        : `No staff matching filter: ${staffFilter}`}
                    </div>
                  ) : (
                    filteredFleet.map((rider: any) => (
                      <div
                        key={rider.id}
                        className="p-4 hover:bg-zinc-50 rounded-2xl transition-colors flex items-center justify-between group cursor-pointer border border-transparent hover:border-zinc-100">
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            <div
                              className={`h-12 w-12 rounded-2xl flex items-center justify-center text-primary-foreground font-black text-lg ${rider.status === "AVAILABLE" ? "bg-emerald-500" : "bg-indigo-500"}`}>
                              {rider.name.charAt(0)}
                            </div>
                            <span
                              className={`absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-white ${rider.status === "AVAILABLE" ? "bg-emerald-500" : "bg-amber-500"}`}></span>
                          </div>
                          <div>
                            <p className="font-bold text-zinc-900 leading-none">
                              {rider.name}
                            </p>
                            <p className="text-xs font-medium text-zinc-500 mt-1">
                              {rider.type}
                            </p>
                            <div className="flex items-center gap-3 mt-1">
                              <span
                                className={`text-[10px] font-black uppercase tracking-wider ${rider.status === "AVAILABLE" ? "text-emerald-500" : "text-amber-500"}`}>
                                {rider.status.replace("_", " ")}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-card rounded-3xl border border-zinc-200 shadow-sm overflow-hidden h-[600px] flex items-center justify-center flex-col gap-4 relative">
            <Map className="h-16 w-16 text-zinc-200 absolute opacity-20 scale-[5] right-10 bottom-10" />
            <MapPin className="h-12 w-12 text-zinc-300 animate-bounce" />
            <h2 className="text-2xl font-black text-zinc-800 tracking-tight">
              Map Integration Required
            </h2>
            <p className="text-zinc-500 text-sm max-w-md text-center font-medium">
              To enable the Live Fleet visual map, you must configure a Google
              Maps or Mapbox API key in your environment variables.
            </p>
            <Button className="mt-4 bg-zinc-900 text-primary-foreground rounded-xl h-11 px-8 font-bold">
              Configure API Keys
            </Button>
          </div>
        )}
      </div>

      {/* --- ASSIGNMENT MODAL --- */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-zinc-950/60 backdrop-blur-md transition-opacity"
            onClick={() => setSelectedTask(null)}></div>
          <div className="bg-card rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden relative z-10 animate-in zoom-in-95 duration-300">
            <div className="p-6 md:p-8 border-b bg-indigo-50/50">
              <h2 className="text-2xl font-black text-zinc-900 tracking-tight mb-1">
                Dispatch Assignment
              </h2>
              <p className="text-sm font-medium text-primary">
                Assign trip {selectedTask.id} to an active staff member.
              </p>
            </div>
            <form onSubmit={handleAssignTask} className="p-6 md:p-8 space-y-6">
              <div className="bg-zinc-50 p-5 rounded-2xl border border-zinc-200 space-y-2">
                <div className="flex justify-between items-start">
                  <p className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">
                    Target Location
                  </p>
                  <span className="text-[10px] font-black uppercase tracking-widest bg-zinc-200 px-2 py-0.5 rounded text-zinc-600">
                    {selectedTask.type.replace("_", " ")}
                  </span>
                </div>
                <p className="font-bold text-zinc-900">{selectedTask.client}</p>
                <p className="text-sm font-medium text-zinc-600">
                  {selectedTask.address}
                </p>
              </div>

              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">
                  Select Available Staff
                </Label>
                <select
                  required
                  className="w-full bg-card border border-zinc-200 rounded-xl p-4 text-sm font-bold text-zinc-900 outline-none focus:ring-2 focus:ring-primary focus:border-indigo-500 shadow-sm appearance-none cursor-pointer">
                  <option value="">-- Choose staff member --</option>
                  {fleet
                    .filter((f: any) => f.status === "AVAILABLE")
                    .map((rider: any) => (
                      <option key={rider.id} value={rider.id}>
                        {rider.name} ({rider.type})
                      </option>
                    ))}
                  <optgroup label="Currently Busy">
                    {fleet
                      .filter((f: any) => f.status !== "AVAILABLE")
                      .map((rider: any) => (
                        <option key={rider.id} value={rider.id} disabled>
                          {rider.name} (Busy)
                        </option>
                      ))}
                  </optgroup>
                </select>
              </div>

              <div className="pt-6 flex flex-col-reverse sm:flex-row justify-end gap-3 border-t border-zinc-100">
                <Button
                  type="button"
                  variant="ghost"
                  className="h-12 rounded-xl px-6 w-full sm:w-auto"
                  onClick={() => setSelectedTask(null)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="h-12 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl px-10 font-black shadow-xl shadow-indigo-200 transition-all w-full sm:w-auto">
                  Confirm Dispatch <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
