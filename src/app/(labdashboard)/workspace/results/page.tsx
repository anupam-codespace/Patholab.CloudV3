"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Download,
  RefreshCw,
  CheckCircle2,
  FlaskConical,
  ShieldCheck,
  Loader2,
  Microscope,
  Fingerprint,
  MoreHorizontal,
  FileText,
} from "lucide-react";
import toast from "react-hot-toast";

// UI Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// --- MAIN PAGE COMPONENT ---
export default function ResultsManagementPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  // 1. FETCH TESTS
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["patient-tests", search, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
        search,
      });
      const res = await fetch(`/api/workspace/tests?${params}`);
      if (!res.ok) throw new Error("Failed to fetch tests");
      return res.json();
    },
  });

  // 2. APPROVAL MUTATION
  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await fetch(`/api/workspace/tests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["patient-tests"] });
      toast.success(`Test marked as ${variables.status}`);
    },
    onError: () => toast.error("Action failed"),
  });

  // 3. DELETE MUTATION
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/workspace/tests/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient-tests"] });
      toast.success("Deleted successfully");
    },
    onError: () => toast.error("Failed to delete record"),
  });

  // WORKFLOW HANDLER
  const handleApproval = (id: string, currentStatus: string) => {
    if (currentStatus === "PENDING" || currentStatus === "IN_PROGRESS") {
      // Technician Step
      statusMutation.mutate({ id, status: "COMPLETED" });
      toast.loading("Completing technical entry...", { duration: 1500 });
    } else if (currentStatus === "COMPLETED") {
      // Doctor Step
      statusMutation.mutate({ id, status: "APPROVED" });
      toast.loading("Doctor approving...", { duration: 1500 });
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 font-sans relative selection:bg-indigo-100 pb-12">
      {/* Decorative Background Mesh */}
      <div className="absolute top-0 inset-x-0 h-64 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-100/40 via-slate-50 to-transparent pointer-events-none z-0" />

      {/* FLOATING HEADER */}
      <header className="sticky top-0 z-30 bg-white/70 backdrop-blur-xl border-b border-slate-200/60 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="h-12 w-12 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center shadow-inner shrink-0">
              <Microscope className="h-6 w-6 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight leading-tight truncate">
                Test Workbench
              </h1>
              <p className="text-xs font-medium text-slate-500 mt-0.5 truncate">
                Manage results, technical entry, and doctor approvals.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <Button
              variant="outline"
              onClick={() => refetch()}
              disabled={isFetching}
              className="bg-white h-11 rounded-xl text-slate-600 font-bold hover:bg-slate-50 border-slate-200 shadow-sm shrink-0 flex-1 md:flex-none">
              <RefreshCw
                className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin text-indigo-500" : ""}`}
              />
              Sync
            </Button>
            <Link
              href="/workspace/tests/create"
              className="flex-1 md:flex-none">
              <Button className="w-full h-11 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-xl shadow-md shadow-indigo-500/25 font-bold transition-all duration-300 hover:-translate-y-0.5 shrink-0 px-6">
                <Plus className="mr-2 h-5 w-5" />
                New Accession
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10 space-y-6">
        {/* TOOLBAR */}
        <div className="bg-white p-2 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row justify-between gap-2">
          <div className="relative w-full md:w-[450px] shrink-0">
            <Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by Test ID, Patient Name..."
              className="pl-10 h-11 bg-slate-50 border-slate-100 focus:bg-white focus:border-indigo-300 focus:ring-indigo-500/20 rounded-xl text-sm transition-all"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* DATA TABLE */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden min-h-[500px] flex flex-col">
          <div className="overflow-x-auto custom-scrollbar flex-1">
            <table className="w-full text-left text-sm text-slate-600 whitespace-nowrap">
              <thead className="bg-slate-50/80 backdrop-blur-sm text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200/80 sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-4 w-[140px]">Test Identity</th>
                  <th className="px-6 py-4 min-w-[250px]">
                    Patient Information
                  </th>
                  <th className="px-6 py-4">Test Details</th>
                  <th className="px-6 py-4 w-[160px]">Workflow Stage</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="h-64 text-center">
                      <div className="flex flex-col items-center justify-center space-y-4">
                        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest animate-pulse">
                          Loading Workbench...
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : data?.data?.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-400 space-y-3">
                        <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center">
                          <FlaskConical className="h-8 w-8 text-slate-300" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-600 text-base">
                            No Records Found
                          </p>
                          <p className="text-xs mt-1">
                            There are no tests matching your search criteria.
                          </p>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  data?.data?.map((test: any) => {
                    const pName = test.patient?.name || "Unknown Patient";
                    const initials = pName
                      .split(" ")
                      .map((n: string) => n[0])
                      .join("")
                      .substring(0, 2)
                      .toUpperCase();

                    return (
                      <tr
                        key={test.id}
                        className="hover:bg-slate-50/80 transition-colors group">
                        {/* ID Col */}
                        <td className="px-6 py-4 align-middle">
                          <div className="flex flex-col gap-1">
                            <span className="text-[11px] font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 w-max flex items-center gap-1.5 shadow-sm">
                              <Fingerprint className="h-3 w-3" />{" "}
                              {test.testNumber || "NO-ID"}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium pl-1">
                              {format(new Date(test.createdAt), "dd MMM yyyy")}
                            </span>
                          </div>
                        </td>

                        {/* Patient Col */}
                        <td className="px-6 py-4 align-middle">
                          <div className="flex items-center gap-4">
                            <Avatar className="h-10 w-10 border border-slate-200 shadow-sm hidden sm:flex shrink-0">
                              <AvatarFallback className="bg-slate-100 text-slate-600 font-bold text-xs">
                                {initials}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col min-w-0">
                              <span className="font-bold text-slate-900 truncate text-sm">
                                {pName}
                              </span>
                              <span className="text-xs text-slate-500 mt-0.5 truncate">
                                {test.patient?.details || "No details provided"}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Test Name Col */}
                        <td className="px-6 py-4 align-middle">
                          <div className="flex flex-col items-start gap-1">
                            <span
                              className="font-bold text-slate-800 text-sm truncate max-w-[250px]"
                              title={test.testName}>
                              {test.testName || "Unknown Test"}
                            </span>
                            <span className="text-[10px] font-mono font-medium text-slate-500 uppercase tracking-wider">
                              CODE: {test.testCode || test.code || "N/A"}
                            </span>
                          </div>
                        </td>

                        {/* Workflow Status Col */}
                        <td className="px-6 py-4 align-middle">
                          <WorkflowBadge status={test.status} />
                        </td>

                        {/* Actions Col */}
                        <td className="px-6 py-4 align-middle text-right">
                          <div className="flex justify-end items-center gap-2">
                            {/* 1. WORKFLOW ACTION BUTTON */}
                            {test.status !== "APPROVED" &&
                              test.status !== "CANCELLED" && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        size="sm"
                                        disabled={statusMutation.isPending}
                                        className={`h-8 px-3 text-xs font-bold gap-1.5 shadow-sm transition-all hover:-translate-y-0.5 ${
                                          test.status === "COMPLETED"
                                            ? "bg-violet-600 hover:bg-violet-700 text-white" // Doctor Color
                                            : "bg-indigo-600 hover:bg-indigo-700 text-white" // Tech Color
                                        }`}
                                        onClick={() =>
                                          handleApproval(test.id, test.status)
                                        }>
                                        {statusMutation.isPending &&
                                        statusMutation.variables?.id ===
                                          test.id ? (
                                          <Loader2 className="h-3 w-3 animate-spin" />
                                        ) : test.status === "COMPLETED" ? (
                                          <ShieldCheck className="h-3.5 w-3.5" />
                                        ) : (
                                          <FlaskConical className="h-3.5 w-3.5" />
                                        )}
                                        {test.status === "COMPLETED"
                                          ? "Approve"
                                          : "Results"}
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent
                                      side="top"
                                      className="text-[10px] font-bold">
                                      {test.status === "COMPLETED"
                                        ? "Doctor Approval (Finalize)"
                                        : "Enter Results (Technician)"}
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}

                            {/* 2. REPORT DOWNLOAD (Only if Approved) */}
                            {test.status === "APPROVED" && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Link
                                      href={`/workspace/reports/print/${test.id}`}
                                      target="_blank">
                                      <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-8 w-8 text-emerald-600 border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 transition-colors shadow-sm">
                                        <Download className="h-4 w-4" />
                                      </Button>
                                    </Link>
                                  </TooltipTrigger>
                                  <TooltipContent
                                    side="top"
                                    className="text-[10px] font-bold">
                                    Download Final Report
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}

                            {/* 3. DROPDOWN MENU */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent
                                align="end"
                                className="w-48 rounded-xl shadow-lg border-slate-200">
                                <DropdownMenuLabel className="text-xs text-slate-500 uppercase tracking-wider font-bold">
                                  Record Options
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <Link href={`/workspace/tests/${test.id}/edit`}>
                                  <DropdownMenuItem className="cursor-pointer text-sm font-medium text-slate-700 focus:bg-slate-50 focus:text-indigo-600">
                                    <Edit className="mr-2 h-4 w-4" /> Edit
                                    Details
                                  </DropdownMenuItem>
                                </Link>
                                <DropdownMenuItem
                                  className="cursor-pointer text-sm font-medium text-rose-600 focus:bg-rose-50 focus:text-rose-700"
                                  onClick={() => {
                                    if (
                                      confirm(
                                        "Are you sure you want to delete this record?",
                                      )
                                    ) {
                                      deleteMutation.mutate(test.id);
                                    }
                                  }}>
                                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                                  Record
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}

// --- SUB-COMPONENT: WORKFLOW BADGE ---
function WorkflowBadge({ status }: { status: string }) {
  if (status === "APPROVED" || status === "FINAL") {
    return (
      <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border-emerald-200 gap-1.5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider shadow-sm">
        <CheckCircle2 className="h-3 w-3" /> Verified
      </Badge>
    );
  }

  if (status === "COMPLETED") {
    return (
      <Badge className="bg-violet-50 text-violet-700 hover:bg-violet-50 border-violet-200 gap-1.5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider shadow-sm">
        <ShieldCheck className="h-3 w-3" /> Doc Review
      </Badge>
    );
  }

  if (status === "IN_PROGRESS" || status === "PENDING") {
    return (
      <Badge className="bg-indigo-50 text-indigo-700 hover:bg-indigo-50 border-indigo-200 gap-1.5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider shadow-sm">
        <FlaskConical className="h-3 w-3" /> Lab Work
      </Badge>
    );
  }

  if (status === "CANCELLED") {
    return (
      <Badge className="bg-rose-50 text-rose-700 hover:bg-rose-50 border-rose-200 gap-1.5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider shadow-sm">
        <Trash2 className="h-3 w-3" /> Cancelled
      </Badge>
    );
  }

  return (
    <Badge className="bg-slate-100 text-slate-600 hover:bg-slate-100 border-slate-200 gap-1.5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider shadow-sm">
      {status || "UNKNOWN"}
    </Badge>
  );
}
