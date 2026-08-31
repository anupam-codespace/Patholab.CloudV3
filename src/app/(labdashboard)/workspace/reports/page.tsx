"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  Printer,
  FileCheck2,
  Filter,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatIST } from "@/lib/timezone";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

// --- TYPESCRIPT INTERFACES ---
export interface Patient {
  name: string;
  phone: string;
  email: string | null;
  patientId?: string;
}

export interface Report {
  id: string;
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
  createdAt: string;
  patient: Patient;
  test?: {
    id: string;
    testName: string;
    testCode: string;
    invoice?: { id: string; invoiceNumber: string };
  };
}

export default function ReportDispatchPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState("print_ready");
  const [shareReport, setShareReport] = useState<Report | null>(null);
  const [downloadReport, setDownloadReport] = useState<Report | null>(null);
  const [amendReport, setAmendReport] = useState<Report | null>(null);
  const [amendmentReason, setAmendmentReason] = useState("");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [printingId, setPrintingId] = useState<string | null>(null);

  // --- DATA FETCH ---
  const { data, isLoading } = useQuery({
    queryKey: ["lab-reports", filter],
    queryFn: async () => {
      const res = await fetch(`/api/workspace/reports?filter=${filter}`);
      if (!res.ok) throw new Error("Failed to fetch reports");
      return res.json();
    },
  });

  const reports: Report[] = data?.reports || [];

  // --- AMEND MUTATION ---
  const amendMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const res = await fetch(`/api/workspace/reports/${id}/amend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
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

  // 1. PDF Download (with or without header)
  const handleDownload = async (report: Report, skipHeader: boolean = false) => {
    setDownloadingId(report.id);
    const toastId = toast.loading(skipHeader ? "Generating PDF without header..." : "Generating PDF...");
    try {
      const verifyUrl = `${window.location.origin}/verify/${report.id}`;

      const res = await fetch("/api/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "public_download",
          reportId: report.id,
          phone: report.patient.phone,
          verificationUrl: verifyUrl,
          skipHeader,
        }),
      });

      if (!res.ok) throw new Error("Failed to generate PDF");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;

      const safePatientName = report.patient.name
        .replace(/[^a-zA-Z0-9]/g, "_")
        .toUpperCase();
      a.download = `Report_${safePatientName}${skipHeader ? "_no_header" : ""}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);

      toast.success("Download Complete!", { id: toastId });
      setDownloadReport(null);
    } catch (e) {
      toast.error("Failed to download PDF.", { id: toastId });
    }
    setDownloadingId(null);
  };

  // 2. Direct Print (open PDF in new window and trigger print)
  const handlePrint = async (report: Report) => {
    setPrintingId(report.id);
    const toastId = toast.loading("Preparing print preview...");
    try {
      const verifyUrl = `${window.location.origin}/verify/${report.id}`;
      const res = await fetch("/api/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "public_download",
          reportId: report.id,
          phone: report.patient.phone,
          verificationUrl: verifyUrl,
        }),
      });
      if (!res.ok) throw new Error("Failed to generate PDF for printing");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);

      // Open PDF in a new window/tab — browser print dialog will be available there
      const win = window.open(url, "_blank");
      if (win) {
        win.addEventListener("load", () => {
          setTimeout(() => {
            win.focus();
            win.print();
          }, 500);
        });
        toast.success("Print preview opened in new tab. Use Ctrl+P if dialog doesn't appear.", { id: toastId });
      } else {
        toast.success("PDF opened in new tab. Use Ctrl+P to print.", { id: toastId });
      }

      // Clean up the blob URL after a delay (let the print dialog work)
      setTimeout(() => window.URL.revokeObjectURL(url), 60000);
    } catch (e) {
      toast.error("Failed to generate print preview.", { id: toastId });
    }
    setPrintingId(null);
  };

  // 3. WhatsApp Share
  const handleWhatsAppShare = (report: Report) => {
    if (!report.patient.phone)
      return toast.error("Patient has no phone number.");

    let phone = report.patient.phone.replace(/\D/g, "");
    if (phone.length === 10) phone = `91${phone}`;

    const verifyUrl = `${window.location.origin}/verify/${report.id}`;
    const message = `Hello ${report.patient.name},\n\nYour lab test report is ready. You can securely view and download it here:\n${verifyUrl}\n\nThank you.`;
    const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

    window.open(whatsappUrl, "_blank");
    toast.success("Opening WhatsApp...");
    setShareReport(null);
  };

  // 4. Email Share
  const handleEmailShare = (report: Report) => {
    if (!report.patient.email)
      return toast.error("Patient has no email address.");

    const verifyUrl = `${window.location.origin}/verify/${report.id}`;
    const subject = `Your Lab Test Report - ${report.test?.testName || "Results"}`;
    const body = `Hello ${report.patient.name},\n\nYour lab test report is ready. You can securely view and download it using the link below:\n\n${verifyUrl}\n\nThank you.`;

    // Gmail compose URL
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
      report.patient.email,
    )}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    window.open(gmailUrl, "_blank");
    setShareReport(null);
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
        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
          <History className="w-3 h-3 mr-1" /> Amended
        </Badge>
      );
    switch (status) {
      case "DRAFT":
        return <Badge variant="secondary" className="text-muted-foreground">Draft</Badge>;
      case "GENERATED":
        return <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">Generated</Badge>;
      case "APPROVED":
        return <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200"><FileCheck2 className="w-3 h-3 mr-1" /> Approved</Badge>;
      case "FINAL":
        return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200"><CheckCircle2 className="w-3 h-3 mr-1" /> Final</Badge>;
      case "SENT_TO_PATIENT":
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Sent</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const filteredReports = reports.filter(
    (r) =>
      r.patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.patient.phone.includes(searchTerm) ||
      (r.test?.testName || "").toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="flex-1 space-y-6 p-6 pt-6 max-w-[1600px] mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Report Dispatch
          </h1>
          <p className="text-base text-muted-foreground mt-1">
            Download, print, amend, and share verified reports with patients.
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
          {/* Filter Tabs */}
          <Tabs value={filter} onValueChange={setFilter}>
            <TabsList>
              <TabsTrigger value="print_ready">Print Ready</TabsTrigger>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="draft">Draft</TabsTrigger>
              <TabsTrigger value="sent">Sent</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Search */}
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <Input
              placeholder="Search by patient, phone, test..."
              className="pl-10 focus-visible:ring-primary shadow-sm border-slate-300"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-card p-3 rounded-lg border text-center">
          <div className="text-2xl font-bold text-emerald-600">
            {reports.filter(r => r.status === "FINAL" || r.status === "APPROVED").length}
          </div>
          <div className="text-xs text-muted-foreground">Print Ready</div>
        </div>
        <div className="bg-card p-3 rounded-lg border text-center">
          <div className="text-2xl font-bold text-amber-600">
            {reports.filter(r => r.status === "DRAFT" || r.status === "GENERATED").length}
          </div>
          <div className="text-xs text-muted-foreground">Drafts</div>
        </div>
        <div className="bg-card p-3 rounded-lg border text-center">
          <div className="text-2xl font-bold text-green-600">
            {reports.filter(r => r.status === "SENT_TO_PATIENT").length}
          </div>
          <div className="text-xs text-muted-foreground">Sent</div>
        </div>
        <div className="bg-card p-3 rounded-lg border text-center">
          <div className="text-2xl font-bold text-amber-700">
            {reports.filter(r => r.isAmended).length}
          </div>
          <div className="text-xs text-muted-foreground">Amended</div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 border-b border-border hover:bg-muted/30">
              <TableHead className="font-semibold text-muted-foreground">Patient</TableHead>
              <TableHead className="font-semibold text-muted-foreground">Test</TableHead>
              <TableHead className="font-semibold text-muted-foreground">Generated</TableHead>
              <TableHead className="font-semibold text-muted-foreground">Version</TableHead>
              <TableHead className="font-semibold text-muted-foreground">Status</TableHead>
              <TableHead className="text-right font-semibold text-muted-foreground">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-slate-100">
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center h-32 text-muted-foreground animate-pulse">
                  Loading reports...
                </TableCell>
              </TableRow>
            ) : filteredReports.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center h-32 text-muted-foreground">
                  {filter === "print_ready"
                    ? "No print-ready reports. Approved/Final reports will appear here."
                    : "No reports found."}
                </TableCell>
              </TableRow>
            ) : (
              filteredReports.map((report) => (
                <TableRow key={report.id} className="hover:bg-muted/50 transition-colors group">
                  <TableCell>
                    <div className="font-bold text-foreground text-sm">{report.patient.name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{report.patient.phone}</div>
                    {report.patient.patientId && (
                      <div className="text-[10px] text-muted-foreground font-mono">{report.patient.patientId}</div>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    <div className="font-medium">{report.test?.testName || "—"}</div>
                    {report.test?.testCode && (
                      <div className="text-xs text-muted-foreground font-mono">{report.test.testCode}</div>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-slate-700">
                    {formatIST(report.createdAt)}
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center justify-center bg-muted text-muted-foreground font-mono text-xs font-bold px-2 py-1 rounded border border-border">
                      v{report.version}.0
                    </span>
                    {report.isAmended && (
                      <div className="text-[10px] text-amber-600 mt-1 flex items-center">
                        <FileWarning className="w-3 h-3 mr-1" /> Re-issued
                      </div>
                    )}
                  </TableCell>
                  <TableCell>{getStatusBadge(report.status, report.isAmended)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end items-center gap-1 flex-wrap">
                      {/* Direct Print */}
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-border text-foreground/80 hover:bg-muted"
                        onClick={() => handlePrint(report)}
                        disabled={printingId === report.id}
                        title="Print Report"
                      >
                        {printingId === report.id ? (
                          <Loader2 className="h-4 w-4 mr-1 text-primary animate-spin" />
                        ) : (
                          <Printer className="h-4 w-4 mr-1 text-primary" />
                        )}
                        Print
                      </Button>

                      {/* Download (with header options) */}
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-border text-foreground/80 hover:bg-muted"
                        onClick={() => setDownloadReport(report)}
                        disabled={downloadingId === report.id}
                        title="Download PDF"
                      >
                        {downloadingId === report.id ? (
                          <Loader2 className="h-4 w-4 mr-1 text-primary animate-spin" />
                        ) : (
                          <Download className="h-4 w-4 mr-1 text-primary" />
                        )}
                        Download
                      </Button>

                      {/* Amend */}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setAmendReport(report)}
                        className="text-muted-foreground/70 hover:text-amber-600 hover:bg-amber-50 h-9 w-9"
                        title="Amend Report"
                      >
                        <FileEdit className="h-4 w-4" />
                      </Button>

                      {/* Share */}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setShareReport(report)}
                        className="text-muted-foreground/70 hover:text-green-600 hover:bg-green-50 h-9 w-9"
                        title="Share via WhatsApp / Email"
                      >
                        <Share2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* ============== DOWNLOAD MODAL (with/without header) ============== */}
      <Dialog
        open={!!downloadReport}
        onOpenChange={(open) => !open && setDownloadReport(null)}
      >
        <DialogContent className="sm:max-w-md text-center p-8">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-4">
            <Download className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-2xl mb-2">Download Report PDF</DialogTitle>
          <DialogDescription className="text-base mb-6">
            Choose whether to include the lab header (logo, address, contact) on the report.
          </DialogDescription>

          <div className="grid grid-cols-1 gap-3">
            <Button
              size="lg"
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-14"
              onClick={() => downloadReport && handleDownload(downloadReport, false)}
              disabled={!!downloadingId}
            >
              {downloadingId ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="mr-2 h-5 w-5" />}
              Download with Header
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="w-full border-2 border-primary text-primary hover:bg-primary/10 h-14"
              onClick={() => downloadReport && handleDownload(downloadReport, true)}
              disabled={!!downloadingId}
            >
              <Download className="mr-2 h-5 w-5" /> Download without Header
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ============== SHARE MODAL (WhatsApp / Email) ============== */}
      <Dialog
        open={!!shareReport}
        onOpenChange={(open) => !open && setShareReport(null)}
      >
        <DialogContent className="sm:max-w-md text-center p-8">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 mb-4">
            <Share2 className="h-6 w-6 text-green-600" />
          </div>
          <DialogTitle className="text-2xl mb-2">Share Report Link</DialogTitle>
          <DialogDescription className="text-base mb-6">
            Send a secure verification link for <strong>v{shareReport?.version}.0</strong> to{" "}
            <strong>{shareReport?.patient.name}</strong>.
          </DialogDescription>

          <div className="grid grid-cols-1 gap-4">
            <Button
              size="lg"
              className="w-full bg-[#25D366] hover:bg-[#1DA851] text-white text-lg h-16 shadow-lg shadow-green-200"
              onClick={() => shareReport && handleWhatsAppShare(shareReport)}
            >
              <MessageCircle className="mr-3 h-6 w-6" /> Send via WhatsApp
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="w-full border-2 border-primary text-primary hover:bg-primary/10 text-lg h-16"
              onClick={() => shareReport && handleEmailShare(shareReport)}
            >
              <Mail className="mr-3 h-6 w-6 text-primary" /> Send via Email
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ============== AMENDMENT MODAL ============== */}
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
            <DialogDescription className="text-muted-foreground mt-2">
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
                className="min-h-[100px] border-border focus-visible:ring-amber-500"
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
