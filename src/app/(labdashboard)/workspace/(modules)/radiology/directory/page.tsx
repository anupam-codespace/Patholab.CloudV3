"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Search, FileText, Download, Loader2, Users, Printer } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import toast from "react-hot-toast";

export default function RadiologyDirectoryPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [isDownloading, setIsDownloading] = useState<string | null>(null);

  // Debounce search so it doesn't spam the API on every keystroke
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setPage(1); // Reset to page 1 on new search
    setTimeout(() => setDebouncedSearch(e.target.value), 500);
  };

  const { data, isLoading } = useQuery({
    queryKey: ["radiology-directory", page, debouncedSearch],
    queryFn: async () => {
      const res = await fetch(`/api/workspace/radiology/directory?page=${page}&query=${debouncedSearch}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const studies = data?.studies || [];
  const pagination = data?.pagination;

  const handleDownload = async (study: any) => {
    setIsDownloading(study.id);
    const toastId = toast.loading("Generating Historical Report...");
    
    try {
      // 🚀 Point this to your existing Radiology PDF generator
      const res = await fetch("/api/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "radiology_download", 
          studyId: study.id,
        }),
      });

      if (!res.ok) throw new Error("Failed to generate PDF");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      window.open(url, "_blank");
      setTimeout(() => window.URL.revokeObjectURL(url), 1000);
      
      toast.success("Report opened successfully!", { id: toastId });
    } catch (error) {
      toast.error("Failed to download report", { id: toastId });
    } finally {
      setIsDownloading(null);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 flex items-center gap-2">
            <Users className="w-8 h-8 text-indigo-600" /> Radiology Archive
          </h1>
          <p className="text-slate-500 font-medium">Search and retrieve past verified patient reports.</p>
        </div>

        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <Input 
            placeholder="Search by Patient Name, Phone, or SID..." 
            className="pl-9 h-11 rounded-xl border-slate-200"
            value={searchTerm}
            onChange={handleSearch}
          />
        </div>
      </div>

      <Card className="rounded-xl shadow-sm border-slate-200 overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="font-bold text-slate-600">Date</TableHead>
              <TableHead className="font-bold text-slate-600">Patient Details</TableHead>
              <TableHead className="font-bold text-slate-600">Scan Details</TableHead>
              <TableHead className="font-bold text-slate-600">Ref. Doctor</TableHead>
              <TableHead className="text-right font-bold text-slate-600">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-slate-100">
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-400" />
                  Loading archive...
                </TableCell>
              </TableRow>
            ) : studies.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-slate-500 font-medium">
                  No historical records found.
                </TableCell>
              </TableRow>
            ) : (
              studies.map((study: any) => (
                <TableRow key={study.id} className="hover:bg-slate-50 transition-colors">
                  <TableCell className="font-medium text-sm text-slate-600">
                    {format(new Date(study.createdAt), "dd MMM yyyy")}
                    <span className="block text-xs text-slate-400">{format(new Date(study.createdAt), "hh:mm a")}</span>
                  </TableCell>
                  
                  <TableCell>
                    <p className="font-bold text-slate-900">{study.patient?.name}</p>
                    <p className="text-xs font-mono text-slate-500">{study.patient?.phone}</p>
                  </TableCell>

                  <TableCell>
                    <p className="font-bold text-sm text-slate-800">{study.scanName}</p>
                    <p className="text-xs text-slate-500 font-mono">SID: {study.accessionNumber}</p>
                  </TableCell>

                  <TableCell className="text-sm font-medium text-slate-600">
                    {study.referringDoctor || "Self"}
                  </TableCell>

                  <TableCell className="text-right">
                    <Button 
                      variant="outline" 
                      onClick={() => handleDownload(study)}
                      disabled={isDownloading === study.id}
                      className="text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                    >
                      {isDownloading === study.id ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Printer className="w-4 h-4 mr-2" />
                      )}
                      Reprint
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* PAGINATION CONTROLS */}
        {pagination && pagination.totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 flex justify-between items-center bg-slate-50/50">
            <span className="text-sm text-slate-500 font-medium">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                disabled={page === pagination.totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}