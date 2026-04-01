"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  FileText,
  Search,
  Printer,
  FileSignature,
  Clock,
  Loader2,
  ExternalLink,
  Fingerprint
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import Link from "next/link";

export default function ReportsArchivePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce search to prevent spamming the API on every keystroke
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setTimeout(() => setDebouncedSearch(e.target.value), 500);
  };

  const { data: reports = [], isLoading, isError } = useQuery({
    queryKey: ["radiology-reports-archive", debouncedSearch],
    queryFn: async () => {
      const res = await fetch(
        `/api/lab-owner/radiology/reports-archive?search=${debouncedSearch}`,
      );
      if (!res.ok) throw new Error("Failed to load reports");
      return res.json();
    },
  });

  if (isError) {
    return (
      <div className="h-[calc(100vh-4rem)] flex flex-col items-center justify-center bg-slate-50 font-sans">
        <FileText className="h-12 w-12 text-rose-400 mb-4" />
        <h2 className="text-xl font-bold text-slate-800">Connection Error</h2>
        <p className="text-slate-500 mb-6 max-w-md text-center">Failed to load the reports archive. Please check your connection or try again.</p>
        <Button onClick={() => window.location.reload()} variant="outline">Retry Connection</Button>
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
              <FileText className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight leading-tight">
                Radiology Reports Archive
              </h1>
              <p className="text-xs font-medium text-slate-500 mt-0.5">
                Search, view, and reprint historical patient reports.
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10 space-y-6">
        
        {/* TOOLBAR */}
        <div className="bg-white p-2 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row justify-between gap-2">
          <div className="relative w-full md:w-[450px] shrink-0">
            <Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by Patient Name, Phone, or Accession No..."
              className="pl-10 h-11 bg-slate-50 border-slate-100 focus:bg-white focus:border-indigo-300 focus:ring-indigo-500/20 rounded-xl text-sm transition-all"
              value={searchQuery}
              onChange={handleSearch}
            />
          </div>
        </div>

        {/* REPORTS TABLE */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden min-h-[500px] flex flex-col">
          <div className="overflow-x-auto custom-scrollbar flex-1">
            <table className="w-full text-left text-sm text-slate-600 whitespace-nowrap">
              <thead className="bg-slate-50/80 backdrop-blur-sm text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200/80 sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-4">Patient Identity</th>
                  <th className="px-6 py-4">Scan Information</th>
                  <th className="px-6 py-4">Report Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={4} className="h-64 text-center">
                      <div className="flex flex-col items-center justify-center space-y-4">
                         <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                         <p className="text-sm font-bold text-slate-400 uppercase tracking-widest animate-pulse">Loading Archive</p>
                      </div>
                    </td>
                  </tr>
                ) : reports.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-400 space-y-3">
                          <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center">
                              <FileText className="h-8 w-8 text-slate-300" />
                          </div>
                          <div>
                              <p className="font-bold text-slate-600 text-base">No Reports Found</p>
                              <p className="text-xs mt-1">There are no reports matching your current search criteria.</p>
                          </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  reports.map((report: any) => {
                    const pName = report.patientName || "Unknown Patient";
                    const initials = pName.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();

                    return (
                    <tr key={report.id || Math.random()} className="hover:bg-slate-50/80 transition-colors group">
                      
                      {/* Patient Col */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                           <Avatar className="h-10 w-10 border border-slate-200 shadow-sm hidden sm:flex shrink-0">
                              <AvatarFallback className="bg-slate-100 text-slate-600 font-bold text-xs">
                                 {initials}
                              </AvatarFallback>
                           </Avatar>
                           <div className="flex flex-col min-w-0">
                             <span className="font-bold text-slate-900 truncate text-base">{pName}</span>
                             <div className="flex items-center gap-2 mt-1">
                               <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 flex items-center gap-1">
                                 {report.patientPhone || "No Phone"}
                               </span>
                             </div>
                           </div>
                        </div>
                      </td>

                      {/* Scan Col */}
                      <td className="px-6 py-4">
                        <div className="flex flex-col items-start gap-1.5">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={`text-[9px] font-bold uppercase tracking-wider border-none shadow-sm
                            ${
                              report.modality === "MRI" ? "bg-violet-100 text-violet-700" :
                              report.modality === "CT" ? "bg-indigo-100 text-indigo-700" :
                              report.modality === "XRAY" ? "bg-amber-100 text-amber-700" :
                              report.modality === "USG" ? "bg-emerald-100 text-emerald-700" :
                              "bg-slate-100 text-slate-600"
                            }`}>
                              {report.modality || "UNK"}
                            </Badge>
                            <span className="font-bold text-slate-800 text-sm truncate max-w-[250px]" title={report.scanName}>
                              {report.scanName || "Unknown Study"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                             <span className="text-[10px] font-mono text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded font-bold border border-indigo-100 flex items-center gap-1">
                               <Fingerprint className="h-2.5 w-2.5"/> {report.accessionNo || "N/A"}
                             </span>
                          </div>
                        </div>
                      </td>

                      {/* Report Status Col */}
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1.5 items-start">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1.5 uppercase tracking-wider border shadow-sm
                          ${report.status === "FINAL" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}>
                            {report.status === "FINAL" ? <FileSignature className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                            {report.status === "FINAL" ? "VERIFIED" : "DRAFT"}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">
                            {report.verifiedDate || "Not Verified"}
                          </span>
                        </div>
                      </td>

                      {/* Actions Col */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2 items-center">
                          {report.status === "FINAL" ? (
                            <Link href={`/lab-owner/radiology/print/${report.id}`} target="_blank" className="w-full sm:w-auto">
                              <Button className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white h-10 rounded-xl shadow-md shadow-indigo-500/25 transition-all duration-300 hover:-translate-y-0.5 font-bold w-full">
                                <Printer className="h-4 w-4 mr-2" /> View & Print
                              </Button>
                            </Link>
                          ) : (
                            <Link href="/lab-owner/radiology/reporting" className="w-full sm:w-auto">
                              <Button variant="outline" className="h-10 rounded-xl font-bold text-amber-700 bg-amber-50 border-amber-200 hover:bg-amber-100 hover:border-amber-300 shadow-sm w-full transition-colors">
                                <ExternalLink className="h-4 w-4 mr-2" /> Complete Report
                              </Button>
                            </Link>
                          )}
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