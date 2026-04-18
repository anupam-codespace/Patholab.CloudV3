"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  FlaskConical,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Clock,
  AlertTriangle,
  Microscope,
  CheckCircle2,
  Activity,
  ArrowRight,
  Filter,
} from "lucide-react";
import { differenceInHours, differenceInMinutes } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// --- UTILS ---
const getTAT = (date: string) => {
  if (!date) return <span className="text-slate-300">-</span>;
  const start = new Date(date);
  const now = new Date();
  const hours = differenceInHours(now, start);
  const mins = differenceInMinutes(now, start) % 60;

  let colorClass = "text-emerald-700 bg-emerald-50 border-emerald-200";
  if (hours > 24) colorClass = "text-rose-700 bg-rose-50 border-rose-200";
  else if (hours > 12)
    colorClass = "text-amber-700 bg-amber-50 border-amber-200";

  return (
    <div
      className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-1 rounded-md border ${colorClass} shadow-sm`}>
      <Clock className="h-3 w-3" /> {hours.toString().padStart(2, "0")}:
      {mins.toString().padStart(2, "0")}
    </div>
  );
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case "PENDING":
    case "SAMPLE_COLLECTED":
      return (
        <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-none text-[10px] px-2 uppercase">
          Pending
        </Badge>
      );
    case "IN_PROGRESS":
      return (
        <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-none text-[10px] px-2 uppercase animate-pulse">
          Processing
        </Badge>
      );
    case "COMPLETED":
      return (
        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none text-[10px] px-2 uppercase">
          Done
        </Badge>
      );
    case "APPROVED":
      return (
        <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-100 border-none text-[10px] px-2 uppercase">
          Approved
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="text-[10px] uppercase">
          {status}
        </Badge>
      );
  }
};

const getPriorityBadge = (priority: string) => {
  if (priority === "URGENT" || priority === "CRITICAL") {
    return (
      <span className="flex items-center gap-1 text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100">
        <AlertTriangle className="h-3 w-3" /> {priority}
      </span>
    );
  }
  return null;
};

export default function TechnicianDashboardPage() {
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("PENDING_ALL");
  const [page, setPage] = useState(1);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Fetch Tests (We assume you have an endpoint that returns tests assigned to the lab)
  // If you don't have `/api/technician/worklist` yet, you can map this to fetch from your existing tests API.
  const queryParams = new URLSearchParams({
    page: page.toString(),
    search: debouncedSearch,
    status: statusFilter,
  }).toString();

  const { data, isLoading } = useQuery({
    queryKey: ["technician-worklist", queryParams],
    queryFn: async () => {
      // NOTE: Update this URL to match your actual API endpoint for fetching tests.
      // Often looks like: `/api/tests?role=technician&${queryParams}`
      const res = await fetch(`/api/technician/worklist?${queryParams}`);
      if (!res.ok) throw new Error("Failed to fetch worklist");
      return res.json();
    },
    placeholderData: (prev) => prev,
    refetchInterval: 10000, // Auto-refresh every 10 seconds for new samples
  });

  const tests = data?.data || [];
  const stats = data?.stats || { pending: 0, urgent: 0, completedToday: 0 };
  const totalPages = data?.pagination?.pages || 1;

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-slate-50 font-sans relative overflow-hidden selection:bg-blue-100">
      {/* Decorative Background */}
      <div className="absolute top-0 inset-x-0 h-64 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-100/50 via-slate-50 to-transparent pointer-events-none z-0" />

      <div className="flex-1 flex flex-col p-4 sm:p-6 z-10 overflow-hidden max-w-[1600px] mx-auto w-full">
        {/* --- TOP HEADER & STATS --- */}
        <div className="flex-none mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2 bg-white/70 backdrop-blur-xl p-5 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col justify-center">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Microscope className="h-6 w-6 text-blue-600" />
              Technician Worklist
            </h1>
            <p className="text-sm font-medium text-slate-500 mt-1">
              Process samples and enter diagnostic results.
            </p>
          </div>

          <Card className="bg-white border-slate-200/60 shadow-sm flex items-center p-4 gap-4 rounded-2xl">
            <div className="h-12 w-12 rounded-full bg-amber-50 flex items-center justify-center shrink-0">
              <Activity className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Pending Tests
              </p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-black text-slate-800">
                  {stats.pending || 0}
                </p>
                {stats.urgent > 0 && (
                  <span className="text-xs font-bold text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded">
                    {stats.urgent} Urgent
                  </span>
                )}
              </div>
            </div>
          </Card>

          <Card className="bg-white border-slate-200/60 shadow-sm flex items-center p-4 gap-4 rounded-2xl">
            <div className="h-12 w-12 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Completed Today
              </p>
              <p className="text-2xl font-black text-slate-800">
                {stats.completedToday || 0}
              </p>
            </div>
          </Card>
        </div>

        {/* --- FILTERS & SEARCH --- */}
        <div className="flex-none mb-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search Barcode, Patient, or Test..."
              className="pl-9 h-10 bg-white border-slate-200 rounded-xl focus:border-blue-500 focus:ring-blue-500/20 shadow-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px] h-10 bg-white border-slate-200 rounded-xl shadow-sm font-medium text-slate-700">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-slate-400" />
                <SelectValue placeholder="Filter Status" />
              </div>
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="ALL">All Tests</SelectItem>
              <SelectItem value="PENDING_ALL">
                Needs Processing (Pending)
              </SelectItem>
              <SelectItem value="IN_PROGRESS">Currently Processing</SelectItem>
              <SelectItem value="COMPLETED">
                Awaiting Approval (Done)
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* --- MAIN DATA TABLE --- */}
        <Card className="flex-1 flex flex-col shadow-sm border-slate-200/80 overflow-hidden rounded-2xl bg-white">
          <div className="flex-1 overflow-auto relative custom-scrollbar">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead className="sticky top-0 z-20 bg-slate-50/90 backdrop-blur-md text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                <tr>
                  <th className="px-5 py-4 w-[150px]">Barcode / Sample</th>
                  <th className="px-4 py-4 w-[250px]">Patient Details</th>
                  <th className="px-4 py-4 min-w-[200px]">Test Name</th>
                  <th className="px-4 py-4 w-[150px]">TAT / Priority</th>
                  <th className="px-4 py-4 w-[120px]">Status</th>
                  <th className="px-5 py-4 text-right w-[140px]">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="h-64 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-500 space-y-3">
                        <Loader2 className="animate-spin h-8 w-8 text-blue-600" />
                        <span className="text-xs font-medium uppercase tracking-widest animate-pulse">
                          Loading Worklist...
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : tests.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="h-64 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-400 space-y-3">
                        <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center">
                          <FlaskConical className="h-8 w-8 text-slate-300" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-600">
                            No pending tests
                          </p>
                          <p className="text-xs mt-1">
                            You are all caught up! Great job.
                          </p>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  tests.map((test: any) => {
                    const patient = test.patient;
                    const sample = test.sample;

                    return (
                      <tr
                        key={test.id}
                        className="group transition-all duration-200 hover:bg-slate-50">
                        {/* 1. Barcode */}
                        <td className="px-5 py-4">
                          <div className="flex flex-col gap-1">
                            <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded w-max">
                              {sample?.sampleId || "NO-SAMPLE"}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium">
                              ID: {test.testNumber}
                            </span>
                          </div>
                        </td>

                        {/* 2. Patient Details */}
                        <td className="px-4 py-4">
                          <div className="flex flex-col min-w-0">
                            <div className="font-bold text-slate-900 truncate">
                              {patient?.name || "Unknown Patient"}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wide">
                                {patient?.age} {patient?.ageUnit?.slice(0, 1)} •{" "}
                                {patient?.gender?.charAt(0)}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* 3. Test Name */}
                        <td className="px-4 py-4">
                          <div className="font-bold text-blue-700 truncate max-w-[250px]">
                            {test.testName}
                          </div>
                          <div className="text-[10px] text-slate-500 font-medium mt-1">
                            Code: {test.testCode}
                          </div>
                        </td>

                        {/* 4. TAT & Priority */}
                        <td className="px-4 py-4">
                          <div className="flex flex-col gap-1.5 items-start">
                            {getTAT(test.sampleCollectedAt || test.createdAt)}
                            {getPriorityBadge(test.priority)}
                          </div>
                        </td>

                        {/* 5. Status */}
                        <td className="px-4 py-4">
                          {getStatusBadge(test.status)}
                        </td>

                        {/* 6. Action */}
                        <td className="px-5 py-4 text-right">
                          <Button
                            onClick={() =>
                              router.push(
                                `/lab-owner/workflow/results/${test.patientId}`,
                              )
                            }
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-sm rounded-lg h-9 text-xs transition-transform active:scale-95">
                            Enter Results{" "}
                            <ArrowRight className="h-3 w-3 ml-1.5" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* --- PAGINATION FOOTER --- */}
          <div className="flex-none px-6 py-4 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-white z-20">
            <div className="text-xs text-slate-500 font-semibold tracking-wide">
              Showing Page <span className="text-slate-900">{page}</span> of{" "}
              <span className="text-slate-900">{totalPages}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="h-9 px-4 rounded-xl text-xs font-bold border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">
                <ChevronLeft className="h-4 w-4 mr-1" /> Prev
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= totalPages}
                className="h-9 px-4 rounded-xl text-xs font-bold border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
