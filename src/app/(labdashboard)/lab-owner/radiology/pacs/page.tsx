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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import toast from "react-hot-toast";

export default function PacsArchivePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [modalityFilter, setModalityFilter] = useState("ALL");

  // Fetch Live Data from API
  const { data, isLoading, isError } = useQuery({
    queryKey: ["radiology-pacs-archive"],
    queryFn: async () => {
      const res = await fetch("/api/lab-owner/radiology/pacs");
      if (!res.ok) throw new Error("Failed to fetch PACS archive");
      return res.json();
    },
    refetchInterval: 60000, // Refresh every minute
  });

  const handleLaunchViewer = (studyUid: string) => {
    if (studyUid === "UNKNOWN-UID") {
      return toast.error(
        "Study Instance UID missing. Images not synced to PACS yet.",
      );
    }
    toast.success("Launching Diagnostic Web Viewer...");

    // Launch standard OHIF/Osimis DICOM Web Viewer.
    // You configure this base URL in your DICOM Settings page.
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

  // Safe fallbacks while loading
  const studies = data?.studies || [];
  const storage = data?.storage || {
    total: "10 TB",
    used: "0 GB",
    percentUsed: 0,
  };
  const uniqueModalities = Array.from(
    new Set(studies.map((s: any) => s.modality)),
  );

  // Client-side filtering
  const filteredStudies = studies.filter((study: any) => {
    const matchesSearch =
      study.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      study.accessionNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      study.patientId.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesModality =
      modalityFilter === "ALL" || study.modality === modalityFilter;
    return matchesSearch && matchesModality;
  });

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-10 text-center text-red-500 font-bold">
        Failed to connect to PACS database.
      </div>
    );
  }

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      {/* HEADER & STORAGE STATS */}
      <div className="flex flex-col md:flex-row justify-between items-start gap-6 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Database className="h-6 w-6 text-blue-600" />
            PACS Server Archive
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Search, view, and manage DICOM studies stored on your server.
          </p>
        </div>

        {/* Dynamic Storage Widget */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm w-full md:w-80 flex flex-col gap-2">
          <div className="flex justify-between items-center text-sm">
            <span className="font-bold text-slate-700 flex items-center gap-1.5">
              <HardDrive className="h-4 w-4 text-slate-400" /> Local Storage
            </span>
            <span
              className={`font-bold ${storage.percentUsed > 80 ? "text-orange-600" : "text-slate-600"}`}>
              {storage.used} / {storage.total}
            </span>
          </div>
          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${storage.percentUsed > 90 ? "bg-red-500" : storage.percentUsed > 80 ? "bg-orange-500" : "bg-blue-500"}`}
              style={{ width: `${storage.percentUsed}%` }}></div>
          </div>
          {storage.percentUsed > 80 && (
            <p className="text-[10px] text-orange-600 font-medium flex items-center gap-1 mt-1">
              <AlertTriangle className="h-3 w-3" /> Storage running low.
              Consider archiving old studies.
            </p>
          )}
        </div>
      </div>

      {/* TOOLBAR */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex flex-col md:flex-row justify-between gap-4">
          <div className="relative w-full md:w-96 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by Patient Name, ID, or Accession..."
                className="pl-9 bg-white"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-slate-200/50 p-1 rounded-lg overflow-x-auto scrollbar-hide">
              {["ALL", ...uniqueModalities].map((mod: any) => (
                <button
                  key={mod}
                  onClick={() => setModalityFilter(mod)}
                  className={`px-4 py-1.5 text-xs font-bold rounded-md transition-colors whitespace-nowrap ${
                    modalityFilter === mod
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}>
                  {mod}
                </button>
              ))}
            </div>
            <Button variant="outline" className="bg-white px-3 shrink-0">
              <Calendar className="h-4 w-4 mr-2" /> Date Filter
            </Button>
          </div>
        </div>

        {/* DATA TABLE */}
        <div className="overflow-x-auto min-h-[500px]">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100 whitespace-nowrap">
              <tr>
                <th className="px-6 py-4">Patient Details</th>
                <th className="px-6 py-4">Study Info</th>
                <th className="px-6 py-4">Data Size</th>
                <th className="px-6 py-4">Server Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudies.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-16 text-center text-slate-400">
                    <Server className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p>
                      No DICOM studies found on the server matching this
                      criteria.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredStudies.map((study: any) => (
                  <tr
                    key={study.accessionNo}
                    className="hover:bg-blue-50/50 transition-colors group">
                    {/* Patient Col */}
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900">
                          {study.patientName}
                        </span>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                            {study.patientId}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">
                            {study.accessionNo}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Study Col */}
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded border
                            ${
                              study.modality === "MRI"
                                ? "bg-purple-100 text-purple-700 border-purple-200"
                                : study.modality === "CT"
                                  ? "bg-blue-100 text-blue-700 border-blue-200"
                                  : study.modality === "XRAY"
                                    ? "bg-amber-100 text-amber-700 border-amber-200"
                                    : "bg-emerald-100 text-emerald-700 border-emerald-200"
                            }`}>
                            {study.modality}
                          </span>
                          <span className="font-bold text-slate-800 text-xs">
                            {study.description}
                          </span>
                        </div>
                        <span className="text-xs text-slate-500 mt-1">
                          {study.studyDate}
                        </span>
                      </div>
                    </td>

                    {/* Data Size Col */}
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <span className="font-medium text-slate-700 flex items-center gap-1.5">
                          <Layers className="h-3 w-3 text-slate-400" />{" "}
                          {study.instances} Images
                        </span>
                        <span className="text-xs text-slate-400">
                          {study.sizeMb > 1000
                            ? `${(study.sizeMb / 1000).toFixed(2)} GB`
                            : `${study.sizeMb.toFixed(0)} MB`}
                        </span>
                      </div>
                    </td>

                    {/* Status Col */}
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1.5">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full w-max flex items-center gap-1
                          ${study.status === "ONLINE" ? "bg-emerald-100 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-slate-600 border border-slate-200"}`}>
                          <Database className="h-3 w-3" /> {study.status}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full w-max border
                          ${
                            study.reportStatus === "FINAL"
                              ? "bg-blue-50 text-blue-600 border-blue-200"
                              : study.reportStatus === "DRAFT" ||
                                  study.reportStatus === "DICTATED"
                                ? "bg-amber-50 text-amber-600 border-amber-200"
                                : "bg-red-50 text-red-600 border-red-200"
                          }`}>
                          {study.reportStatus === "UNREAD"
                            ? "UNREAD"
                            : `REPORT: ${study.reportStatus}`}
                        </span>
                      </div>
                    </td>

                    {/* Actions Col */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleDownloadDicom}
                          className="text-slate-500 hover:text-blue-600 hidden md:flex"
                          title="Download DICOM Zip">
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          onClick={() => handleLaunchViewer(study.studyUid)}
                          size="sm"
                          className="bg-slate-900 hover:bg-slate-800 text-white shadow-sm transition-transform active:scale-95 min-w-[130px]">
                          <MonitorPlay className="h-4 w-4 mr-2" /> View Images
                        </Button>
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
  );
}
