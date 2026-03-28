"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Disc,
  Printer,
  Smartphone,
  Search,
  CheckCircle2,
  Clock,
  Send,
  FileSignature,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import toast from "react-hot-toast";

export default function MediaDispatchPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("ALL"); // ALL, PROCESSING, READY, DISPATCHED

  // 1. Fetch Live Queue
  const { data: queue = [], isLoading } = useQuery({
    queryKey: ["radiology-media-queue"],
    queryFn: async () => {
      const res = await fetch("/api/lab-owner/radiology/media");
      if (!res.ok) throw new Error("Failed to load queue");
      return res.json();
    },
    refetchInterval: 30000, // Auto-refresh every 30s
  });

  // 2. Update Status Mutation
  const updateMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/lab-owner/radiology/media", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      return data;
    },
    onSuccess: (data, variables) => {
      if (variables.mediaType === "digital")
        toast.success("Digital link sent via SMS/WhatsApp.");
      else if (variables.mediaType === "cd")
        toast.success("CD Burning logged.");
      else if (variables.mediaType === "film")
        toast.success("Film marked as printed.");
      else if (variables.mediaType === "overallStatus")
        toast.success("Handover complete!");

      queryClient.invalidateQueries({ queryKey: ["radiology-media-queue"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Filter Logic
  const filteredQueue = queue.filter((item: any) => {
    const matchesSearch =
      item.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter =
      activeFilter === "ALL" || item.mediaStatus.overallStatus === activeFilter;
    return matchesSearch && matchesFilter;
  });

  // Stats
  const processingCount = queue.filter(
    (q: any) => q.mediaStatus.overallStatus === "PROCESSING",
  ).length;
  const readyCount = queue.filter(
    (q: any) => q.mediaStatus.overallStatus === "READY",
  ).length;
  const dispatchedCount = queue.filter(
    (q: any) => q.mediaStatus.overallStatus === "DISPATCHED",
  ).length;

  // Handlers
  const handleAction = (
    studyId: string,
    currentMediaStatus: any,
    mediaType: string,
    newStatus: string,
  ) => {
    updateMutation.mutate({
      studyId,
      mediaType,
      newStatus,
      currentMediaStatus,
    });
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Disc className="h-6 w-6 text-blue-600" />
            Films & Media Dispatch
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage film printing, DICOM CD burning, and digital handovers.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() =>
            queryClient.invalidateQueries({
              queryKey: ["radiology-media-queue"],
            })
          }
          disabled={isLoading}>
          <Clock className="h-4 w-4 mr-2" /> Refresh Queue
        </Button>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-100 text-amber-600 rounded-lg">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">
              Processing / Printing
            </p>
            <h3 className="text-2xl font-bold text-slate-900">
              {processingCount}
            </h3>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-100 text-emerald-600 rounded-lg">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">
              Ready for Handover
            </p>
            <h3 className="text-2xl font-bold text-slate-900">{readyCount}</h3>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
            <Send className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">
              Total Dispatched
            </p>
            <h3 className="text-2xl font-bold text-slate-900">
              {dispatchedCount}
            </h3>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden min-h-[500px]">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex flex-col md:flex-row justify-between gap-4">
          <div className="flex gap-2 bg-slate-200/50 p-1 rounded-lg overflow-x-auto scrollbar-hide">
            {["ALL", "PROCESSING", "READY", "DISPATCHED"].map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`px-4 py-1.5 text-xs font-bold rounded-md transition-colors ${
                  activeFilter === filter
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}>
                {filter}
              </button>
            ))}
          </div>
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search patient or accession no..."
              className="pl-9 bg-white"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Dispatch Table */}
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100 whitespace-nowrap">
                <tr>
                  <th className="px-6 py-4">Patient & Scan</th>
                  <th className="px-6 py-4">Required Media Prep</th>
                  <th className="px-6 py-4">Report & Dispatch Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredQueue.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-6 py-16 text-center text-slate-400">
                      <Disc className="h-12 w-12 mx-auto mb-3 opacity-20" />
                      <p>No dispatches found for the selected criteria.</p>
                    </td>
                  </tr>
                ) : (
                  filteredQueue.map((item: any) => {
                    const mStatus = item.mediaStatus;
                    const isReportFinal = item.clinicalStatus === "VERIFIED";

                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-slate-50 transition-colors group">
                        {/* Patient Col */}
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-900">
                              {item.patientName}
                            </span>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                                {item.id}
                              </span>
                              <span className="text-xs text-slate-500">
                                {item.modality} • {item.scanName}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400 mt-1">
                              Scanned: {item.time}
                            </span>
                          </div>
                        </td>

                        {/* Media Prep Col */}
                        <td className="px-6 py-4">
                          <div className="flex gap-4">
                            {/* FILM */}
                            <div className="flex flex-col items-center gap-1 group/btn relative">
                              <button
                                onClick={() =>
                                  mStatus.film === "PENDING"
                                    ? handleAction(
                                        item.studyId,
                                        mStatus,
                                        "film",
                                        "PRINTED",
                                      )
                                    : null
                                }
                                disabled={
                                  updateMutation.isPending ||
                                  mStatus.film === "PRINTED"
                                }
                                className={`p-2 rounded-lg border transition-colors ${
                                  mStatus.film === "PENDING"
                                    ? "border-amber-200 bg-amber-50 text-amber-600 hover:bg-amber-100"
                                    : "border-blue-200 bg-blue-50 text-blue-600 cursor-default"
                                }`}>
                                <Printer className="h-4 w-4" />
                              </button>
                              <span className="text-[9px] font-bold uppercase">
                                {mStatus.film}
                              </span>
                            </div>

                            {/* CD */}
                            <div className="flex flex-col items-center gap-1">
                              <button
                                onClick={() =>
                                  mStatus.cd === "PENDING"
                                    ? handleAction(
                                        item.studyId,
                                        mStatus,
                                        "cd",
                                        "BURNED",
                                      )
                                    : null
                                }
                                disabled={
                                  updateMutation.isPending ||
                                  mStatus.cd === "BURNED"
                                }
                                className={`p-2 rounded-lg border transition-colors ${
                                  mStatus.cd === "PENDING"
                                    ? "border-amber-200 bg-amber-50 text-amber-600 hover:bg-amber-100"
                                    : "border-blue-200 bg-blue-50 text-blue-600 cursor-default"
                                }`}>
                                <Disc className="h-4 w-4" />
                              </button>
                              <span className="text-[9px] font-bold uppercase">
                                {mStatus.cd}
                              </span>
                            </div>

                            {/* DIGITAL */}
                            <div className="flex flex-col items-center gap-1">
                              <button
                                onClick={() =>
                                  handleAction(
                                    item.studyId,
                                    mStatus,
                                    "digital",
                                    "SENT",
                                  )
                                }
                                disabled={
                                  updateMutation.isPending || !isReportFinal
                                }
                                title={
                                  !isReportFinal
                                    ? "Cannot send digital copy until Radiologist verifies report"
                                    : "Send WhatsApp Link"
                                }
                                className={`p-2 rounded-lg border transition-colors ${
                                  !isReportFinal
                                    ? "border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed"
                                    : mStatus.digital === "PENDING"
                                      ? "border-amber-200 bg-amber-50 text-amber-600 hover:bg-amber-100"
                                      : "border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                                }`}>
                                <Smartphone className="h-4 w-4" />
                              </button>
                              <span className="text-[9px] font-bold uppercase">
                                {mStatus.digital}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Status Col */}
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-2">
                            {/* Medical Report Status */}
                            <span
                              className={`text-[10px] font-bold flex items-center gap-1 ${isReportFinal ? "text-emerald-600" : "text-amber-600"}`}>
                              {isReportFinal ? (
                                <FileSignature className="h-3 w-3" />
                              ) : (
                                <Clock className="h-3 w-3" />
                              )}
                              REPORT:{" "}
                              {isReportFinal ? "VERIFIED" : "PENDING DOCTOR"}
                            </span>

                            {/* Dispatch Status */}
                            <span
                              className={`px-2.5 py-1 text-[10px] font-bold rounded-full uppercase tracking-wider flex w-max items-center gap-1.5 border
                              ${
                                mStatus.overallStatus === "PROCESSING"
                                  ? "bg-amber-100 text-amber-700 border-amber-200"
                                  : mStatus.overallStatus === "READY"
                                    ? "bg-blue-100 text-blue-700 border-blue-200"
                                    : "bg-emerald-100 text-emerald-700 border-emerald-200"
                              }`}>
                              {mStatus.overallStatus === "PROCESSING" && (
                                <Clock className="h-3 w-3" />
                              )}
                              {mStatus.overallStatus === "READY" && (
                                <CheckCircle2 className="h-3 w-3" />
                              )}
                              {mStatus.overallStatus === "DISPATCHED" && (
                                <CheckCircle2 className="h-3 w-3" />
                              )}
                              {mStatus.overallStatus}
                            </span>
                          </div>
                        </td>

                        {/* Actions Col */}
                        <td className="px-6 py-4 text-right">
                          {mStatus.overallStatus === "DISPATCHED" ? (
                            <span className="text-xs font-bold text-slate-400 flex items-center justify-end gap-1">
                              <CheckCircle2 className="h-4 w-4" /> Handed Over
                            </span>
                          ) : (
                            <div className="flex flex-col items-end gap-2">
                              {!isReportFinal && (
                                <span className="text-[10px] text-amber-600 flex items-center gap-1">
                                  <AlertCircle className="h-3 w-3" /> Waiting on
                                  Radiologist
                                </span>
                              )}
                              <Button
                                onClick={() =>
                                  handleAction(
                                    item.studyId,
                                    mStatus,
                                    "overallStatus",
                                    "DISPATCHED",
                                  )
                                }
                                disabled={
                                  updateMutation.isPending ||
                                  mStatus.overallStatus === "PROCESSING" ||
                                  !isReportFinal
                                }
                                size="sm"
                                className={
                                  mStatus.overallStatus === "READY" &&
                                  isReportFinal
                                    ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-md"
                                    : "bg-slate-100 text-slate-400 border border-slate-200"
                                }>
                                {updateMutation.isPending &&
                                mStatus.overallStatus !== "DISPATCHED" ? (
                                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                ) : null}
                                Handover to Patient
                              </Button>
                            </div>
                          )}
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
    </div>
  );
}
