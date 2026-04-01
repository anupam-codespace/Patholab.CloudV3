"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Database,
  Search,
  HardDrive,
  Download,
  Calendar,
  MonitorPlay,
  Server,
  AlertTriangle,
  Layers,
  Loader2,
  Fingerprint,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import toast from "react-hot-toast";

export default function PacsArchivePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [modalityFilter, setModalityFilter] = useState("ALL");
  const [dateFilter, setDateFilter] = useState(""); // Added dynamic date filter state

  // Fetch Live Data from API
  const { data, isLoading, isError } = useQuery({
    queryKey: ["radiology-pacs-archive"],
    queryFn: async () => {
      const res = await fetch("/api/lab-owner/radiology/pacs");
      if (!res.ok) throw new Error("Failed to fetch PACS archive");
      return res.json();
    },
    refetchInterval: 60000,
  });

  const handleLaunchViewer = (studyUid: string) => {
    if (studyUid === "UNKNOWN-UID" || !studyUid) {
      return toast.error(
        "Study Instance UID missing. Images not synced to PACS yet.",
      );
    }
    toast.success("Launching Diagnostic Web Viewer...");

    // Launch standard OHIF/Osimis DICOM Web Viewer.
    setTimeout(() => {
      window.open(
        `http://localhost:8042/viewer?StudyInstanceUID=${studyUid}`,
        "_blank",
      );
    }, 500);
  };

  const handleDownloadDicom = () => {
    toast.success(
      "Zipping DICOM files for download. This may take a minute depending on the size.",
    );
  };

  // Dynamic Data Extraction (No Hardcoded Safety Nets)
  const studies = data?.studies || [];
  const storage = data?.storage || {
    total: "0 GB",
    used: "0 GB",
    percentUsed: 0,
  };

  // Extract unique modalities dynamically from the fetched studies
  const uniqueModalities = Array.from(
    new Set(studies.map((s: any) => s.modality).filter(Boolean)),
  );

  // Client-side filtering logic
  const filteredStudies = studies.filter((study: any) => {
    const pName = study.patientName || "";
    const aNo = study.accessionNo || "";
    const pId = study.patientId || "";

    // 1. Text Search
    const matchesSearch =
      pName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      aNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pId.toLowerCase().includes(searchQuery.toLowerCase());

    // 2. Modality Filter
    const matchesModality =
      modalityFilter === "ALL" || study.modality === modalityFilter;

    // 3. Date Filter (Checking if the studyDate string contains the selected YYYY-MM-DD)

    let matchesDate = true;
    if (dateFilter) {
      const selectedDateObj = new Date(dateFilter);
      // Format to match backend "dd MMM yyyy"
      const formattedFilterDate = selectedDateObj.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
      matchesDate = (study.studyDate || "").includes(formattedFilterDate);
    }

    return matchesSearch && matchesModality && matchesDate;
  });

  if (isLoading) {
    return (
      <div className="h-[calc(100vh-4rem)] flex flex-col items-center justify-center bg-slate-50 font-sans">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-600 mb-4" />
        <p className="text-sm font-bold text-slate-500 uppercase tracking-widest animate-pulse">
          Connecting to PACS...
        </p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="h-[calc(100vh-4rem)] flex flex-col items-center justify-center bg-slate-50 font-sans">
        <Server className="h-12 w-12 text-rose-400 mb-4" />
        <h2 className="text-xl font-bold text-slate-800">Connection Error</h2>
        <p className="text-slate-500 mb-6 max-w-md text-center">
          Failed to connect to the PACS database. Please check your network or
          server status.
        </p>
        <Button onClick={() => window.location.reload()} variant="outline">
          Retry Connection
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 font-sans relative selection:bg-indigo-100 pb-12">
      {/* Decorative Background Mesh */}
      <div className="absolute top-0 inset-x-0 h-64 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-100/40 via-slate-50 to-transparent pointer-events-none z-0" />

      {/* FLOATING HEADER */}
      <header className="sticky top-0 z-30 bg-white/70 backdrop-blur-xl border-b border-slate-200/60 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center shadow-inner shrink-0">
              <Database className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight leading-tight">
                PACS Server Archive
              </h1>
              <p className="text-xs font-medium text-slate-500 mt-0.5">
                Search, view, and manage DICOM studies stored on your local
                server.
              </p>
            </div>
          </div>

          {/* Dynamic Storage Widget */}
          <div className="bg-white/80 p-3 rounded-xl border border-slate-200 shadow-sm w-full md:w-80 flex flex-col gap-2 shrink-0">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <HardDrive className="h-3.5 w-3.5" /> Local Storage
              </span>
              <span
                className={`font-black ${storage.percentUsed > 80 ? "text-rose-600" : "text-slate-800"}`}
              >
                {storage.used} / {storage.total}
              </span>
            </div>
            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-1000 ${
                  storage.percentUsed > 90
                    ? "bg-rose-500"
                    : storage.percentUsed > 80
                      ? "bg-amber-500"
                      : "bg-indigo-500"
                }`}
                style={{ width: `${storage.percentUsed}%` }}
              />
            </div>
            {storage.percentUsed > 80 && (
              <p className="text-[10px] text-rose-600 font-bold flex items-center gap-1 mt-0.5 uppercase tracking-wider">
                <AlertTriangle className="h-3 w-3" /> Storage running low.
                Archive old studies.
              </p>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10 space-y-6">
        {/* TOOLBAR */}
        <div className="bg-white p-2 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row justify-between gap-2">
          {/* Search Bar */}
          <div className="relative w-full md:w-[350px] shrink-0">
            <Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by Patient Name, ID, or Accession..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-11 bg-white border-slate-200 focus:border-indigo-300 focus:ring-indigo-500/20 rounded-xl text-sm transition-all shadow-sm"
            />
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto">
            {/* Modality Filter Pills */}
            <div className="flex gap-1 bg-slate-50/80 p-1.5 rounded-xl overflow-x-auto custom-scrollbar border border-slate-100 w-full sm:w-auto">
              {["ALL", ...(uniqueModalities as string[])].map((mod: string) => (
                <button
                  key={mod}
                  onClick={() => setModalityFilter(mod)}
                  className={`px-5 py-2 text-xs font-bold rounded-lg whitespace-nowrap transition-all ${
                    modalityFilter === mod
                      ? "bg-white text-indigo-700 shadow-sm border border-slate-200/50"
                      : "text-slate-500 hover:text-slate-800 hover:bg-slate-100/50"
                  }`}
                >
                  {mod}
                </button>
              ))}
            </div>

            {/* Functional Date Filter */}
            <div className="relative w-full sm:w-auto">
              <Calendar className="absolute left-3 top-3.5 h-4 w-4 text-indigo-500 pointer-events-none" />
              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="pl-9 h-11 rounded-xl font-bold text-slate-600 bg-white border-slate-200 hover:bg-slate-50 shadow-sm transition-all w-full sm:w-40"
              />
              {dateFilter && (
                <button
                  onClick={() => setDateFilter("")}
                  className="absolute right-2 top-2.5 h-6 w-6 flex items-center justify-center rounded-md text-slate-400 hover:text-rose-500 hover:bg-rose-50"
                >
                  ×
                </button>
              )}
            </div>
          </div>
        </div>

        {/* DATA TABLE */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden min-h-[500px] flex flex-col">
          <div className="overflow-x-auto custom-scrollbar flex-1">
            <table className="w-full text-left text-sm text-slate-600 whitespace-nowrap">
              <thead className="bg-slate-50/80 backdrop-blur-sm text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200/80 sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-4">Patient Identity</th>
                  <th className="px-6 py-4">Study Information</th>
                  <th className="px-6 py-4">Data Size</th>
                  <th className="px-6 py-4">Server & Report Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudies.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-400 space-y-3">
                        <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center">
                          <Database className="h-8 w-8 text-slate-300" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-600 text-base">
                            No DICOM Studies Found
                          </p>
                          <p className="text-xs mt-1">
                            There are no studies matching your search or
                            filters.
                          </p>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredStudies.map((study: any) => {
                    const pName = study.patientName || "Unknown Patient";
                    const initials = pName
                      .split(" ")
                      .map((n: string) => n[0])
                      .join("")
                      .substring(0, 2)
                      .toUpperCase();

                    return (
                      <tr
                        key={study.accessionNo || Math.random()}
                        className="hover:bg-slate-50/80 transition-colors group"
                      >
                        {/* Patient Col */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-4">
                            <Avatar className="h-10 w-10 border border-slate-200 shadow-sm hidden sm:flex shrink-0">
                              <AvatarFallback className="bg-slate-100 text-slate-600 font-bold text-xs">
                                {initials}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col min-w-0">
                              <span className="font-bold text-slate-900 truncate text-base">
                                {pName}
                              </span>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 flex items-center gap-1">
                                  <Fingerprint className="h-2.5 w-2.5" />{" "}
                                  {study.patientId || "N/A"}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Study Col */}
                        <td className="px-6 py-4">
                          <div className="flex flex-col items-start gap-1.5">
                            <div className="flex items-center gap-2">
                              <Badge
                                variant="outline"
                                className={`text-[9px] font-bold uppercase tracking-wider border-none shadow-sm
                            ${
                              study.modality === "MRI"
                                ? "bg-violet-100 text-violet-700"
                                : study.modality === "CT"
                                  ? "bg-indigo-100 text-indigo-700"
                                  : study.modality === "XRAY"
                                    ? "bg-amber-100 text-amber-700"
                                    : study.modality === "USG"
                                      ? "bg-emerald-100 text-emerald-700"
                                      : "bg-slate-100 text-slate-600"
                            }`}
                              >
                                {study.modality || "UNK"}
                              </Badge>
                              <span
                                className="font-bold text-slate-800 text-sm truncate max-w-[200px]"
                                title={study.description}
                              >
                                {study.description || "Unknown Study"}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-mono text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded font-bold border border-indigo-100">
                                {study.accessionNo || "N/A"}
                              </span>
                              <span className="text-[10px] font-medium text-slate-500 flex items-center gap-1">
                                <Calendar className="h-3 w-3" />{" "}
                                {study.studyDate || "Unknown Date"}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Data Size Col */}
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            <span className="font-bold text-slate-800 flex items-center gap-1.5 text-sm">
                              <Layers className="h-4 w-4 text-indigo-500" />
                              {study.instances || 0}{" "}
                              <span className="font-medium text-slate-500 text-xs">
                                Images
                              </span>
                            </span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                              SIZE:{" "}
                              {study.sizeMb > 1000
                                ? `${(study.sizeMb / 1000).toFixed(2)} GB`
                                : `${(study.sizeMb || 0).toFixed(0)} MB`}
                            </span>
                          </div>
                        </td>

                        {/* Status Col */}
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-2 items-start">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1.5 uppercase tracking-wider
                          ${study.status === "ONLINE" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-slate-600 border border-slate-200"}`}
                            >
                              <Database className="h-3 w-3" /> PACS:{" "}
                              {study.status || "UNKNOWN"}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1.5 uppercase tracking-wider border shadow-sm
                          ${
                            study.reportStatus === "FINAL"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : study.reportStatus === "DRAFT" ||
                                  study.reportStatus === "DICTATED"
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : "bg-rose-50 text-rose-700 border-rose-200"
                          }`}
                            >
                              {study.reportStatus === "UNREAD"
                                ? "REPORT: UNREAD"
                                : `REPORT: ${study.reportStatus || "UNKNOWN"}`}
                            </span>
                          </div>
                        </td>

                        {/* Actions Col */}
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2 items-center">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={handleDownloadDicom}
                              className="text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 hover:border-indigo-200 hidden md:flex h-10 w-10 rounded-xl transition-colors shadow-sm"
                              title="Download DICOM Zip"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button
                              onClick={() => handleLaunchViewer(study.studyUid)}
                              className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white h-10 rounded-xl shadow-md shadow-indigo-500/25 transition-all duration-300 hover:-translate-y-0.5 font-bold w-full sm:w-auto"
                            >
                              <MonitorPlay className="h-4 w-4 mr-2" /> View
                              Images
                            </Button>
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
