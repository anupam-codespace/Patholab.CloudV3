"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  FileText,
  Download,
  MessageCircle,
  Mail,
  History,
  Search,
  AlertCircle,
  CheckCircle2,
  FileEdit,
  Share2,
  FileWarning,
  Loader2,
} from "lucide-react";
import toast from "react-hot-toast";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

// --- TYPESCRIPT INTERFACES ---
export interface Patient {
  name: string;
  phone: string;
  email: string | null;
}

export interface Report {
  id: string;
  testId:string;
  version: number;
  status:
    | "DRAFT"
    | "GENERATED"
    | "APPROVED"
    | "FINAL"
    | "AMENDED"
    | "SENT_TO_PATIENT";
  pdfUrl: string | null;
  isAmended: boolean;
  amendmentReason: string | null;
  createdAt: string;
  patient: Patient;
}

// --- MOCK API (Replace with your actual fetcher) ---
const fetchReports = async (): Promise<Report[]> => {
  const res = await fetch("/api/reports/", {
    cache: "no-store",
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(
      data.error || "Failed to fetch reports"
    );
  }

  return data.reports || [];
};

export default function ReportsDispatchPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");

  // Modals & Active States
  const [shareReport, setShareReport] = useState<Report | null>(null);
  const [amendReport, setAmendReport] = useState<Report | null>(null);
  const [amendmentReason, setAmendmentReason] = useState("");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Fetch Reports
  const { data: reports = [], isLoading } = useQuery<Report[]>({
    queryKey: ["lab-reports"],
    queryFn: fetchReports,
  });

  // Amendment Mutation
  const amendMutation = useMutation({
    mutationFn: async (data: { id: string; reason: string }) => {
      const res = await fetch(`/api/reports/generate/${data.id}/amend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: data.reason }),
      });
      if (!res.ok) throw new Error("Failed to amend report");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Report moved to Amendment status. Version updated.");
      setAmendReport(null);
      setAmendmentReason("");
      queryClient.invalidateQueries({ queryKey: ["lab-reports"] });
    },
    onError: () => toast.error("Failed to amend report."),
  });

  // --- HANDLERS ---

// 1. Dynamic Server-Side PDF Download
  const handleDownload = async (report: Report) => {
    setDownloadingId(report.id);
    const toastId = toast.loading("Securely generating PDF...");
    try {
      const verifyUrl = `${window.location.origin}/verify/${report.id}`;

     // 🚀 THE FIX: Make sure the action is strictly "public_download"
      const res = await fetch("/api/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "public_download", // <--- THIS is the magic word that triggers Pathology
         testId: report.testId,

          phone: report.patient.phone,
          verificationUrl: verifyUrl, 
        }),
      });

      if (!res.ok) {
         const errorData = await res.json().catch(() => ({}));
         throw new Error(errorData.error || "Failed to generate PDF");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;

      const safePatientName = report.patient.name
        .replace(/[^a-zA-Z0-9]/g, "_")
        .toUpperCase();
      a.download = `Report_${safePatientName}.pdf`;
      a.click();

      toast.success("Download Complete!", { id: toastId });
    } catch (e: any) {
      toast.error(e.message || "Failed to download PDF.", { id: toastId });
    } finally {
      setDownloadingId(null);
    }
  };

  // 2. Verification Link WhatsApp Share
  const handleWhatsAppShare = (report: Report) => {
    if (!report.patient.phone)
      return toast.error("Patient has no phone number.");

    // Format the phone number (assuming India +91 if not provided)
    let phone = report.patient.phone.replace(/\D/g, "");
    if (phone.length === 10) phone = `91${phone}`;

    const verifyUrl = `${window.location.origin}/verify/${report.id}`;
    const message = `Hello ${report.patient.name},\n\nYour lab test report is ready. You can securely view and download it here:\n${verifyUrl}\n\nThank you,\nPatholab Cloud`;
    const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

    window.open(whatsappUrl, "_blank");
    toast.success("Opening WhatsApp...");
  };

  // 3. Verification Link Email Share (Gmail Specific)
  const handleEmailShare = (report: Report) => {
    if (!report.patient.email)
      return toast.error("Patient has no email address.");

    const verifyUrl = `${window.location.origin}/verify/${report.id}`;
    const subject = `Your Lab Test Report - Patholab Cloud`;
    const body = `Hello ${report.patient.name},\n\nYour lab test report is ready. You can securely view and download it using the link below:\n\n${verifyUrl}\n\nThank you,\nPatholab Cloud`;

    // Explicit Gmail URL
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
      report.patient.email,
    )}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    window.open(gmailUrl, "_blank");
  };

  const submitAmendment = () => {
    if (!amendReport) return;
    if (amendmentReason.length < 5)
      return toast.error("Please provide a valid reason for the amendment.");
    amendMutation.mutate({ id: amendReport.id, reason: amendmentReason });
  };

  // --- UI HELPERS ---
  const getStatusBadge = (status: string, isAmended: boolean) => {
    if (isAmended)
      return (
        <Badge
          variant="outline"
          className="bg-amber-50 text-amber-700 border-amber-200"
        >
          <History className="w-3 h-3 mr-1" /> Amended
        </Badge>
      );
    switch (status) {
      case "DRAFT":
        return (
          <Badge variant="secondary" className="text-slate-500">
            Draft
          </Badge>
        );
      case "GENERATED":
        return (
          <Badge
            variant="outline"
            className="bg-blue-50 text-blue-700 border-blue-200"
          >
            Generated
          </Badge>
        );
      case "APPROVED":
        return (
          <Badge
            variant="outline"
            className="bg-indigo-50 text-indigo-700 border-indigo-200"
          >
            Approved
          </Badge>
        );
      case "FINAL":
        return (
          <Badge
            variant="outline"
            className="bg-emerald-50 text-emerald-700 border-emerald-200"
          >
            <CheckCircle2 className="w-3 h-3 mr-1" /> Final
          </Badge>
        );
      case "SENT_TO_PATIENT":
        return (
          <Badge
            variant="outline"
            className="bg-green-50 text-green-700 border-green-200"
          >
            Sent
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const filteredReports = reports.filter(
    (r) =>
      r.patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.patient.phone.includes(searchTerm),
  );

  return (
    <div className="flex-1 space-y-6 p-6 pt-6 max-w-[1600px] mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Report Dispatch
          </h1>
          <p className="text-base text-muted-foreground mt-1">
            Download, amend, and instantly share verified report links with
            patients.
          </p>
        </div>

        <div className="relative w-full md:w-80">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            size={18}
          />
          <Input
            placeholder="Search by patient name or phone..."
            className="pl-10 focus-visible:ring-blue-500 shadow-sm border-slate-300"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 border-b border-slate-200 hover:bg-slate-50">
              <TableHead className="font-semibold text-slate-600">
                Patient Details
              </TableHead>
              <TableHead className="font-semibold text-slate-600">
                Date Generated
              </TableHead>
              <TableHead className="font-semibold text-slate-600">
                Version
              </TableHead>
              <TableHead className="font-semibold text-slate-600">
                Status
              </TableHead>
              <TableHead className="text-right font-semibold text-slate-600">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-slate-100">
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center h-32 text-slate-500 animate-pulse"
                >
                  Loading reports...
                </TableCell>
              </TableRow>
            ) : filteredReports.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center h-32 text-slate-500"
                >
                  No reports found.
                </TableCell>
              </TableRow>
            ) : (
              filteredReports.map((report) => (
                <TableRow
                  key={report.id}
                  className="hover:bg-slate-50/80 transition-colors group"
                >
                  <TableCell>
                    <div className="font-bold text-slate-900 text-sm">
                      {report.patient.name}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {report.patient.phone}
                    </div>
                  </TableCell>

                  <TableCell className="text-sm text-slate-700">
                    {format(new Date(report.createdAt), "dd MMM yyyy, hh:mm a")}
                  </TableCell>

                  <TableCell>
                    <span className="inline-flex items-center justify-center bg-slate-100 text-slate-600 font-mono text-xs font-bold px-2 py-1 rounded border border-slate-200">
                      v{report.version}.0
                    </span>
                    {report.isAmended && (
                      <div className="text-[10px] text-amber-600 mt-1 flex items-center">
                        <FileWarning className="w-3 h-3 mr-1" /> Re-issued
                      </div>
                    )}
                  </TableCell>

                  <TableCell>
                    {getStatusBadge(report.status, report.isAmended)}
                  </TableCell>

                  <TableCell className="text-right">
                    <div className="flex justify-end items-center gap-2">
                      {/* Dynamic Download Button */}
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-slate-200 text-slate-700 hover:bg-slate-100 w-[110px]"
                        onClick={() => handleDownload(report)}
                        disabled={downloadingId === report.id}
                      >
                        {downloadingId === report.id ? (
                          <Loader2 className="h-4 w-4 mr-2 text-blue-600 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4 mr-2 text-blue-600" />
                        )}
                        Download
                      </Button>

                      {/* Amend Button */}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setAmendReport(report)}
                        className="text-slate-400 hover:text-amber-600 hover:bg-amber-50 h-9 w-9"
                        title="Amend Report"
                      >
                        <FileEdit className="h-4 w-4" />
                      </Button>

                      {/* WhatsApp Direct Icon Button */}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleWhatsAppShare(report)}
                        className="text-slate-400 hover:text-[#25D366] hover:bg-[#25D366]/10 h-9 w-9"
                        title="Share via WhatsApp"
                      >
                        <svg
                          viewBox="0 0 24 24"
                          className="h-4 w-4 fill-current"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
                        </svg>
                      </Button>

                      {/* Email Direct Icon Button */}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEmailShare(report)}
                        className="text-slate-400 hover:text-blue-600 hover:bg-blue-50 h-9 w-9"
                        title="Share via Email"
                      >
                        <Mail className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* =========================================
          GIANT SHARE MODAL
      ========================================= */}

      {/* =========================================
          AMENDMENT MODAL
      ========================================= */}
      <Dialog
        open={!!amendReport}
        onOpenChange={(open) => {
          if (!open) {
            setAmendReport(null);
            setAmendmentReason("");
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl text-amber-700 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" /> Amend Medical Report
            </DialogTitle>
            <DialogDescription className="text-slate-600 mt-2">
              You are about to unlock report{" "}
              <strong>v{amendReport?.version}.0</strong> for{" "}
              {amendReport?.patient.name}. This will increment the version to{" "}
              <strong>v{(amendReport?.version || 0) + 1}.0</strong>. Under
              medical compliance laws, you MUST state the reason for this
              change.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">
                Reason for Amendment *
              </label>
              <Textarea
                placeholder="e.g., Corrected typo in clinical notes, re-ran sample for verification..."
                value={amendmentReason}
                onChange={(e) => setAmendmentReason(e.target.value)}
                className="min-h-[100px] border-slate-300 focus-visible:ring-amber-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setAmendReport(null)}>
              Cancel
            </Button>
            <Button
              className="bg-amber-600 hover:bg-amber-700 text-white"
              onClick={submitAmendment}
              disabled={amendMutation.isPending || amendmentReason.length < 5}
            >
              {amendMutation.isPending ? "Unlocking..." : "Confirm & Unlock"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
