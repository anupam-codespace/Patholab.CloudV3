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
  Fingerprint,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import toast from "react-hot-toast";

export default function MediaDispatchPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("ALL"); // ALL, PROCESSING, READY, DISPATCHED

  // 1. Fetch Live Queue
  const { data: queue = [], isLoading } = useQuery({
    queryKey: ["radiology-media-queue"],
    queryFn: async () => {
      const res = await fetch("/api/workspace/radiology/media");
      if (!res.ok) throw new Error("Failed to load queue");
      return res.json();
    },
    refetchInterval: 30000, // Auto-refresh every 30s
  });

  // 2. Update Status Mutation
  const updateMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/workspace/radiology/media", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update status");
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
    const pName = item.patientName || "";
    const pId = item.id || "";
    const matchesSearch =
      pName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pId.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter =
      activeFilter === "ALL" ||
      item.mediaStatus?.overallStatus === activeFilter;
    return matchesSearch && matchesFilter;
  });

  // Stats
  const processingCount = queue.filter(
    (q: any) => q.mediaStatus?.overallStatus === "PROCESSING",
  ).length;
  const readyCount = queue.filter(
    (q: any) => q.mediaStatus?.overallStatus === "READY",
  ).length;
  const dispatchedCount = queue.filter(
    (q: any) => q.mediaStatus?.overallStatus === "DISPATCHED",
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
    <div className="min-h-[calc(100vh-4rem)] bg-muted/30 font-sans relative selection:bg-indigo-100 pb-12">
      {/* Decorative Background Mesh */}
      <div className="absolute top-0 inset-x-0 h-64 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-100/40 via-slate-50 to-transparent pointer-events-none z-0" />

      {/* FLOATING HEADER */}
      <header className="sticky top-0 z-30 bg-card/70 backdrop-blur-xl border-b border-slate-200/60 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center shadow-inner shrink-0">
              <Disc className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground tracking-tight leading-tight">
                Films & Media Dispatch
              </h1>
              <p className="text-xs font-medium text-muted-foreground mt-0.5">
                Manage film printing, DICOM CD burning, and digital handovers.
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            onClick={() =>
              queryClient.invalidateQueries({
                queryKey: ["radiology-media-queue"],
              })
            }
            disabled={isLoading}
            className="h-11 rounded-xl bg-card border-border text-foreground/80 font-bold hover:bg-muted/30 transition-colors shadow-sm w-full md:w-auto">
            <RefreshCw
              className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
            />
            Refresh Queue
          </Button>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10 space-y-6">
        {/* STATS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-0 shadow-sm rounded-2xl hover:shadow-md transition-shadow bg-card overflow-hidden relative">
            <div className="absolute top-0 inset-x-0 h-1 bg-amber-400" />
            <CardContent className="p-6 flex items-center gap-5">
              <div className="h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 border bg-amber-50 border-amber-200/50">
                <Clock className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">
                  Processing
                </p>
                <h3 className="text-2xl font-black text-foreground tracking-tight leading-none">
                  {processingCount}
                </h3>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm rounded-2xl hover:shadow-md transition-shadow bg-card overflow-hidden relative">
            <div className="absolute top-0 inset-x-0 h-1 bg-indigo-500" />
            <CardContent className="p-6 flex items-center gap-5">
              <div className="h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 border bg-indigo-50 border-indigo-200/50">
                <CheckCircle2 className="h-6 w-6 text-indigo-600" />
              </div>
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">
                  Ready for Handover
                </p>
                <h3 className="text-2xl font-black text-foreground tracking-tight leading-none">
                  {readyCount}
                </h3>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm rounded-2xl hover:shadow-md transition-shadow bg-card overflow-hidden relative">
            <div className="absolute top-0 inset-x-0 h-1 bg-emerald-500" />
            <CardContent className="p-6 flex items-center gap-5">
              <div className="h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 border bg-emerald-50 border-emerald-200/50">
                <Send className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">
                  Total Dispatched
                </p>
                <h3 className="text-2xl font-black text-foreground tracking-tight leading-none">
                  {dispatchedCount}
                </h3>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* MAIN CONTENT AREA */}
        <div className="bg-card rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden min-h-[500px] flex flex-col">
          {/* Toolbar */}
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row justify-between gap-4">
            {/* Filter Pills */}
            <div className="flex gap-1.5 bg-slate-100/80 p-1.5 rounded-xl overflow-x-auto custom-scrollbar border border-slate-200/50 w-full md:w-auto">
              {["ALL", "PROCESSING", "READY", "DISPATCHED"].map((filter) => (
                <button
                  key={filter}
                  onClick={() => setActiveFilter(filter)}
                  className={`px-5 py-2 text-xs font-bold rounded-lg whitespace-nowrap transition-all ${
                    activeFilter === filter
                      ? "bg-card text-indigo-700 shadow-sm border border-slate-200/50"
                      : "text-muted-foreground hover:text-foreground hover:bg-slate-200/50"
                  }`}>
                  {filter}
                </button>
              ))}
            </div>

            {/* Search Bar */}
            <div className="relative w-full md:w-80 shrink-0">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search patient or accession no..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-11 bg-card border-border focus:border-indigo-300 focus:ring-indigo-500/20 rounded-xl text-sm transition-all shadow-sm"
              />
            </div>
          </div>

          {/* Dispatch Table */}
          <div className="flex-1 overflow-x-auto custom-scrollbar">
            {isLoading ? (
              <div className="flex flex-col h-[400px] items-center justify-center space-y-4">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                <p className="text-sm font-bold text-muted-foreground/70 uppercase tracking-widest animate-pulse">
                  Loading Queue
                </p>
              </div>
            ) : (
              <table className="w-full text-left text-sm text-muted-foreground whitespace-nowrap">
                <thead className="bg-slate-50/80 backdrop-blur-sm text-muted-foreground font-bold uppercase tracking-wider text-[10px] border-b border-slate-200/80 sticky top-0 z-10">
                  <tr>
                    <th className="px-6 py-4">Patient & Scan</th>
                    <th className="px-6 py-4">Required Media Prep</th>
                    <th className="px-6 py-4">Report & Dispatch Status</th>
                    <th className="px-6 py-4 text-right">Handover Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredQueue.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-20 text-center">
                        <div className="flex flex-col items-center justify-center text-muted-foreground/70 space-y-3">
                          <div className="h-16 w-16 bg-muted/30 rounded-full flex items-center justify-center">
                            <Disc className="h-8 w-8 text-slate-300" />
                          </div>
                          <div>
                            <p className="font-bold text-muted-foreground text-base">
                              No Dispatches Found
                            </p>
                            <p className="text-xs mt-1">
                              There are no records matching your current filter
                              criteria.
                            </p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredQueue.map((item: any) => {
                      const mStatus = item.mediaStatus || {};
                      const isReportFinal = item.clinicalStatus === "VERIFIED";
                      const pName = item.patientName || "Unknown Patient";
                      const initials = pName
                        .split(" ")
                        .map((n: string) => n[0])
                        .join("")
                        .substring(0, 2)
                        .toUpperCase();

                      return (
                        <tr
                          key={item.id}
                          className="hover:bg-muted/50/80 transition-colors group">
                          {/* Patient Col */}
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-4">
                              <Avatar className="h-10 w-10 border border-border shadow-sm hidden sm:flex shrink-0">
                                <AvatarFallback className="bg-muted text-muted-foreground font-bold text-xs">
                                  {initials}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex flex-col min-w-0">
                                <span className="font-bold text-foreground truncate text-base">
                                  {pName}
                                </span>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border flex items-center gap-1">
                                    <Fingerprint className="h-2.5 w-2.5" />{" "}
                                    {item.id}
                                  </span>
                                  <Badge
                                    variant="outline"
                                    className="text-[9px] font-bold uppercase tracking-wider bg-muted/30 text-foreground/80 border-border">
                                    {item.modality || "N/A"}
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-2 mt-1.5">
                                  <span className="text-xs font-medium text-muted-foreground truncate">
                                    {item.scanName || "Unknown Scan"}
                                  </span>
                                  <span className="text-[10px] font-medium text-muted-foreground/70 flex items-center gap-1">
                                    <Clock className="h-2.5 w-2.5" />{" "}
                                    {item.time}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Media Prep Col */}
                          <td className="px-6 py-4">
                            <div className="flex gap-4 items-start">
                              {/* FILM Toggle */}
                              <div className="flex flex-col items-center gap-1.5 w-14">
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
                                  className={`h-10 w-10 rounded-xl flex items-center justify-center border shadow-sm transition-all ${
                                    mStatus.film === "PENDING"
                                      ? "border-amber-300 bg-amber-50 text-amber-600 hover:bg-amber-100 hover:scale-105 active:scale-95"
                                      : "border-emerald-200 bg-emerald-50 text-emerald-600 cursor-default"
                                  }`}>
                                  {mStatus.film === "PRINTED" ? (
                                    <CheckCircle2 className="h-5 w-5" />
                                  ) : (
                                    <Printer className="h-5 w-5" />
                                  )}
                                </button>
                                <span
                                  className={`text-[9px] font-bold uppercase tracking-wider ${mStatus.film === "PRINTED" ? "text-emerald-600" : "text-amber-600"}`}>
                                  {mStatus.film || "N/A"}
                                </span>
                              </div>

                              {/* CD Toggle */}
                              <div className="flex flex-col items-center gap-1.5 w-14">
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
                                  className={`h-10 w-10 rounded-xl flex items-center justify-center border shadow-sm transition-all ${
                                    mStatus.cd === "PENDING"
                                      ? "border-amber-300 bg-amber-50 text-amber-600 hover:bg-amber-100 hover:scale-105 active:scale-95"
                                      : "border-emerald-200 bg-emerald-50 text-emerald-600 cursor-default"
                                  }`}>
                                  {mStatus.cd === "BURNED" ? (
                                    <CheckCircle2 className="h-5 w-5" />
                                  ) : (
                                    <Disc className="h-5 w-5" />
                                  )}
                                </button>
                                <span
                                  className={`text-[9px] font-bold uppercase tracking-wider ${mStatus.cd === "BURNED" ? "text-emerald-600" : "text-amber-600"}`}>
                                  {mStatus.cd || "N/A"}
                                </span>
                              </div>

                              {/* DIGITAL Toggle */}
                              <div className="flex flex-col items-center gap-1.5 w-14">
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
                                  className={`h-10 w-10 rounded-xl flex items-center justify-center border shadow-sm transition-all ${
                                    !isReportFinal
                                      ? "border-border bg-muted text-muted-foreground/70 cursor-not-allowed"
                                      : mStatus.digital === "PENDING"
                                        ? "border-amber-300 bg-amber-50 text-amber-600 hover:bg-amber-100 hover:scale-105 active:scale-95"
                                        : "border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 hover:scale-105 active:scale-95"
                                  }`}>
                                  {mStatus.digital === "SENT" ? (
                                    <CheckCircle2 className="h-5 w-5" />
                                  ) : (
                                    <Smartphone className="h-5 w-5" />
                                  )}
                                </button>
                                <span
                                  className={`text-[9px] font-bold uppercase tracking-wider ${
                                    !isReportFinal
                                      ? "text-slate-400"
                                      : mStatus.digital === "SENT"
                                        ? "text-emerald-600"
                                        : "text-amber-600"
                                  }`}>
                                  {mStatus.digital || "N/A"}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Status Col */}
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-2">
                              {/* Medical Report Status */}
                              <span
                                className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${isReportFinal ? "text-emerald-600" : "text-amber-600"}`}>
                                {isReportFinal ? (
                                  <FileSignature className="h-3.5 w-3.5" />
                                ) : (
                                  <Clock className="h-3.5 w-3.5" />
                                )}
                                Report:{" "}
                                {isReportFinal ? "Verified" : "Pending Doctor"}
                              </span>

                              {/* Dispatch Status */}
                              <span
                                className={`px-2.5 py-1 text-[10px] font-bold rounded-md uppercase tracking-wider flex w-max items-center gap-1.5 border shadow-sm ${
                                  mStatus.overallStatus === "PROCESSING"
                                    ? "bg-amber-50 text-amber-700 border-amber-200"
                                    : mStatus.overallStatus === "READY"
                                      ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                                      : "bg-emerald-50 text-emerald-700 border-emerald-200"
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
                                {mStatus.overallStatus || "UNKNOWN"}
                              </span>
                            </div>
                          </td>

                          {/* Actions Col */}
                          <td className="px-6 py-4 text-right">
                            {mStatus.overallStatus === "DISPATCHED" ? (
                              <div className="flex items-center justify-end gap-1.5 text-slate-400">
                                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                                <span className="text-xs font-bold uppercase tracking-wider">
                                  Handed Over
                                </span>
                              </div>
                            ) : (
                              <div className="flex flex-col items-end gap-2">
                                {!isReportFinal && (
                                  <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider flex items-center gap-1 bg-amber-50 px-2 py-1 rounded border border-amber-100">
                                    <AlertCircle className="h-3 w-3" /> Waiting
                                    on Radiologist
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
                                  className={`h-11 rounded-xl px-5 font-bold shadow-md transition-all duration-300 ${
                                    mStatus.overallStatus === "READY" &&
                                    isReportFinal
                                      ? "bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white hover:-translate-y-0.5 shadow-indigo-500/25"
                                      : "bg-muted text-muted-foreground/70 border border-border cursor-not-allowed shadow-none"
                                  }`}>
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
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
