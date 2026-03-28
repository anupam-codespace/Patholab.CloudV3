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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";

export default function ReportsArchivePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce search to prevent spamming the API on every keystroke
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setTimeout(() => setDebouncedSearch(e.target.value), 500);
  };

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ["radiology-reports-archive", debouncedSearch],
    queryFn: async () => {
      const res = await fetch(
        `/api/lab-owner/radiology/reports-archive?search=${debouncedSearch}`,
      );
      if (!res.ok) throw new Error("Failed to load reports");
      return res.json();
    },
  });

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <FileText className="h-6 w-6 text-blue-600" />
            All Radiology Reports
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Search, view, and reprint historical patient reports.
          </p>
        </div>
      </div>

      {/* TOOLBAR */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between gap-4">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by Patient Name, Phone, or Accession..."
            className="pl-9 bg-white"
            value={searchQuery}
            onChange={handleSearch}
          />
        </div>
      </div>

      {/* REPORTS TABLE */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden min-h-[500px]">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100 whitespace-nowrap">
                <tr>
                  <th className="px-6 py-4">Patient Details</th>
                  <th className="px-6 py-4">Scan Details</th>
                  <th className="px-6 py-4">Report Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reports.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-6 py-16 text-center text-slate-400">
                      <FileText className="h-12 w-12 mx-auto mb-3 opacity-20" />
                      <p>No reports found matching your search.</p>
                    </td>
                  </tr>
                ) : (
                  reports.map((report: any) => (
                    <tr
                      key={report.id}
                      className="hover:bg-slate-50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900">
                            {report.patientName}
                          </span>
                          <span className="text-xs text-slate-500">
                            {report.patientPhone}
                          </span>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex flex-col items-start">
                          <span className="font-bold text-slate-800">
                            {report.scanName}
                          </span>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                              {report.accessionNo}
                            </span>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-100">
                              {report.modality}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1.5">
                          <span
                            className={`text-[10px] font-bold px-2.5 py-1 rounded-full w-max flex items-center gap-1.5
                            ${report.status === "FINAL" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                            {report.status === "FINAL" ? (
                              <FileSignature className="h-3 w-3" />
                            ) : (
                              <Clock className="h-3 w-3" />
                            )}
                            {report.status === "FINAL" ? "VERIFIED" : "DRAFT"}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {report.verifiedDate}
                          </span>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          {report.status === "FINAL" ? (
                            <Link
                              href={`/lab-owner/radiology/print/${report.id}`}
                              target="_blank">
                              <Button
                                size="sm"
                                className="bg-slate-900 hover:bg-slate-800 text-white shadow-sm transition-transform active:scale-95">
                                <Printer className="h-4 w-4 mr-2" /> View &
                                Print
                              </Button>
                            </Link>
                          ) : (
                            <Link href="/lab-owner/radiology/reporting">
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-amber-600 border-amber-200 hover:bg-amber-50">
                                <ExternalLink className="h-4 w-4 mr-2" />{" "}
                                Complete Report
                              </Button>
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
