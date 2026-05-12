"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Loader2,
  CheckCircle2,
  Download,
  Building2,
  User,
  FileText,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import toast from "react-hot-toast";

// --- FETCH VERIFICATION DATA ---
const fetchVerificationData = async (id: string) => {
  const res = await fetch(`/api/verify/${id}`);
  if (!res.ok) throw new Error("Failed to verify report");
  return res.json();
};

export default function VerifyReportPage() {
  const params = useParams();
  const id = params.id as string;
  const [isDownloading, setIsDownloading] = useState(false);

  // React Query to fetch the visual data
  const {
    data: report,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["verify", id],
    queryFn: () => fetchVerificationData(id),
    retry: false,
  });

  // --- TRIGGER SECURE PDF GENERATION ---
  const handleDownload = async () => {
    setIsDownloading(true);
    const toastId = toast.loading("Securely generating your digital PDF...");
    try {
      const res = await fetch("/api/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "public_download",
          reportId: id,
          verificationUrl: window.location.href,
        }),
      });

      if (!res.ok) throw new Error("Failed to generate PDF");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;

      const safePatientName =
        report.patient?.name?.replace(/[^a-zA-Z0-9]/g, "_").toUpperCase() ||
        "PATIENT";
      a.download = `Report_${safePatientName}.pdf`;
      a.click();

      toast.success("Download Complete!", { id: toastId });
    } catch (e) {
      toast.error("Failed to download PDF.", { id: toastId });
    }
    setIsDownloading(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <Loader2 className="animate-spin h-10 w-10 text-blue-600 mb-4" />
        <p className="text-slate-500 font-medium animate-pulse">
          Verifying digital signature...
        </p>
      </div>
    );
  }

  if (isError || !report) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-red-100 p-4 rounded-full mb-6">
          <AlertTriangle className="h-12 w-12 text-red-600" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">
          Verification Failed
        </h1>
        <p className="text-slate-600 max-w-md">
          We could not find a valid digital report associated with this QR code.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 flex justify-center items-start">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
        {/* GREEN VERIFIED HEADER */}
        <div className="bg-emerald-600 p-8 text-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent pointer-events-none"></div>
          <div className="relative z-10 flex flex-col items-center">
            <div className="bg-white p-2 rounded-full mb-4 shadow-lg">
              <CheckCircle2 className="h-10 w-10 text-emerald-600" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-wide">
              Authentic Report
            </h1>
            <p className="text-emerald-100 mt-1 flex items-center justify-center gap-1 text-sm font-medium">
              <ShieldCheck size={16} /> Digitally Signed & Verified
            </p>
          </div>
        </div>

        <div className="p-6 sm:p-8 space-y-8">
          {/* LAB INFO */}
          <div className="flex items-start gap-4 pb-6 border-b border-slate-100">
            <div className="bg-blue-50 p-3 rounded-xl text-blue-600 shrink-0">
              <Building2 size={24} />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Issued By
              </p>
              <h2 className="text-lg font-bold text-slate-900 leading-tight">
                {report.lab?.name || "Verified Laboratory"}
              </h2>
              <p className="text-sm text-slate-500 mt-0.5">
                {report.lab?.city || "Healthcare Facility"}
              </p>
            </div>
          </div>

          {/* PATIENT INFO */}
          <div className="flex items-start gap-4 pb-6 border-b border-slate-100">
            <div className="bg-indigo-50 p-3 rounded-xl text-indigo-600 shrink-0">
              <User size={24} />
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Patient Details
              </p>
              <div className="grid grid-cols-2 gap-y-3 mt-2">
                <div>
                  <p className="text-[10px] uppercase text-slate-500 font-bold mb-0.5">
                    Name
                  </p>
                  <p className="font-bold text-slate-900 text-sm">
                    {report.patient?.name}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-slate-500 font-bold mb-0.5">
                    Patient ID (UHID)
                  </p>
                  <p className="font-bold text-slate-900 text-sm">
                    {report.patient?.patientId}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-slate-500 font-bold mb-0.5">
                    Age / Gender
                  </p>
                  <p className="font-semibold text-slate-700 text-sm">
                    {report.patient?.age} {report.patient?.ageUnit} /{" "}
                    {report.patient?.gender}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* DOWNLOAD BUTTON */}
          <div className="pt-6">
            <Button
              onClick={handleDownload}
              disabled={isDownloading}
              className="w-full h-14 text-lg bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-blue-600/30 transition-all font-bold">
              {isDownloading ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <Download className="mr-2 h-5 w-5" />
              )}
              {isDownloading ? "Generating PDF..." : "Download Digital PDF"}
            </Button>
            <p className="text-center text-xs text-slate-400 mt-4 leading-relaxed">
              This digital document carries the exact same legal and medical
              validity as your physical printed report.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
