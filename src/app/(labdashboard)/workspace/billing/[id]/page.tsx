"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Printer,
  ArrowLeft,
  Settings2,
  Loader2,
  Phone,
  Mail,
  Palette,
  Download,
  QrCode,
  XCircle,
  CheckCircle2,
  ShieldCheck,
  History,
  MousePointer2,
  MapPin,
  Users,
  Building2,
} from "lucide-react";
import { format } from "date-fns";
import toast from "react-hot-toast";
import Barcode from "react-barcode";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function InvoiceDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const invoiceId = params.id as string;
  const [isDownloading, setIsDownloading] = useState(false);

  const [config, setConfig] = useState({
    showHeader: true,
    showFooter: true,
    showLogo: true,
    showSignature: true,
    accentColor: "blue",
    fontStyle: "sans",
  });

  const { data: invoice, isLoading } = useQuery({
    queryKey: ["invoice", invoiceId],
    queryFn: async () => {
      const res = await fetch(`/api/workspace/invoices/${invoiceId}`);
      if (!res.ok) throw new Error("Failed to load invoice");
      return res.json();
    },
  });

  const statusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      const res = await fetch(`/api/workspace/invoices/${invoiceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: (data) => {
      toast.success(`Invoice marked as ${data.status}`);
      queryClient.invalidateQueries({ queryKey: ["invoice", invoiceId] });
    },
    onError: () => toast.error("Update failed"),
  });

  const handleDownloadPdf = async () => {
    setIsDownloading(true);
    const element = document.getElementById("invoice-container");
    if (!element) return;
    try {
      const html2pdf = (await import("html2pdf.js")).default;
      const opt = {
        margin: 0,
        filename: `Invoice-${invoice?.invoiceNumber || "file"}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      };
      await html2pdf().set(opt).from(element).save();
      toast.success("PDF Downloaded successfully");
    } catch (e) {
      toast.error("Failed to generate PDF");
    } finally {
      setIsDownloading(false);
    }
  };

  if (isLoading)
    return (
      <div className="h-screen flex items-center justify-center bg-muted/30">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm font-semibold text-muted-foreground">
            Loading secure document...
          </p>
        </div>
      </div>
    );

  if (!invoice)
    return (
      <div className="h-screen flex items-center justify-center font-bold text-rose-500 bg-muted/30">
        <XCircle className="mr-2 h-6 w-6" /> Invoice not found
      </div>
    );

  const colors = {
    blue: {
      bg: "bg-primary",
      text: "text-primary",
      light: "bg-primary/10",
      border: "border-blue-600",
      muted: "text-primary",
    },
    green: {
      bg: "bg-emerald-600",
      text: "text-emerald-600",
      light: "bg-emerald-50",
      border: "border-emerald-600",
      muted: "text-emerald-700",
    },
    black: {
      bg: "bg-slate-900",
      text: "text-foreground",
      light: "bg-muted",
      border: "border-slate-900",
      muted: "text-slate-700",
    },
    violet: {
      bg: "bg-violet-600",
      text: "text-violet-600",
      light: "bg-violet-50",
      border: "border-violet-600",
      muted: "text-violet-700",
    },
  }[config.accentColor as "blue" | "green" | "black" | "violet"] || {
    bg: "bg-primary",
    text: "text-primary",
    light: "bg-primary/10",
    border: "border-blue-600",
    muted: "text-primary",
  };

  const fontClass = config.fontStyle === "serif" ? "font-serif" : "font-sans";

  return (
    <>
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 0;
          }
          body * {
            visibility: hidden;
          }
          #invoice-container,
          #invoice-container * {
            visibility: visible;
          }
          #invoice-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            height: auto;
            margin: 0;
            padding: 15mm !important;
            background: white;
            box-shadow: none !important;
            border: none !important;
          }
        }
      `}</style>

      <div className="min-h-screen bg-muted/30 flex flex-col items-center pb-20 print:bg-card print:p-0">
        {/* --- STICKY TOOLBAR --- */}
        <div className="sticky top-0 z-50 w-full bg-card/80 backdrop-blur-xl border-b border-border px-4 md:px-8 py-3 flex flex-col md:flex-row justify-between items-center gap-4 print:hidden shadow-sm">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <Button
              variant="outline"
              className="h-10 rounded-xl bg-card shadow-sm hover:bg-muted/30 transition-all text-slate-700"
              onClick={() => router.push("/workspace/patients")}>
              <Users className="h-4 w-4 mr-2 text-muted-foreground" />
              Patient Worklist
            </Button>
            <div className="h-6 w-px bg-slate-200 hidden md:block" />
            <div className="hidden md:flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Invoice Record
              </span>
              <span className="font-mono text-sm font-bold text-foreground">
                #{invoice.invoiceNumber}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 w-full md:w-auto">
            {/* Status Switcher */}
            <div className="flex items-center gap-2 bg-card px-3 py-1.5 rounded-xl shadow-sm border border-border">
              <span className="text-xs font-semibold text-muted-foreground mr-1">
                Status:
              </span>
              <Select
                value={invoice.status}
                onValueChange={(val) => statusMutation.mutate(val)}
                disabled={statusMutation.isPending}>
                <SelectTrigger
                  className={`h-8 border-none shadow-none text-xs font-bold w-[110px] focus:ring-0 ${invoice.status === "PAID" ? "text-emerald-600 bg-emerald-50" : "text-amber-600 bg-amber-50"}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-none shadow-xl">
                  <SelectItem
                    value="PENDING"
                    className="text-amber-600 font-bold">
                    Pending
                  </SelectItem>
                  <SelectItem
                    value="PAID"
                    className="text-emerald-600 font-bold">
                    Paid
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  className="h-10 w-10 rounded-xl bg-card shadow-sm">
                  <Settings2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </SheetTrigger>
              <SheetContent className="w-[350px] border-none shadow-2xl rounded-l-[24px] p-6">
                <SheetHeader className="mb-6">
                  <SheetTitle className="text-xl font-bold tracking-tight">
                    Invoice Settings
                  </SheetTitle>
                </SheetHeader>
                <div className="space-y-8">
                  <div className="space-y-3">
                    <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-2">
                      <Palette className="h-4 w-4" /> Accent Theme
                    </Label>
                    <div className="flex gap-3">
                      {["blue", "green", "violet", "black"].map((c) => (
                        <button
                          key={c}
                          onClick={() =>
                            setConfig({ ...config, accentColor: c })
                          }
                          className={`h-8 w-8 rounded-full transition-all ${config.accentColor === c ? "ring-2 ring-offset-2 ring-slate-400 scale-110 shadow-md" : "opacity-70 hover:opacity-100"} ${
                            c === "blue"
                              ? "bg-primary"
                              : c === "green"
                                ? "bg-emerald-600"
                                : c === "violet"
                                  ? "bg-violet-600"
                                  : "bg-slate-900"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <Separator />
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium text-slate-700">
                        Lab Header
                      </Label>
                      <Switch
                        checked={config.showHeader}
                        onCheckedChange={(v) =>
                          setConfig({ ...config, showHeader: v })
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium text-slate-700">
                        Authorized Signature
                      </Label>
                      <Switch
                        checked={config.showSignature}
                        onCheckedChange={(v) =>
                          setConfig({ ...config, showSignature: v })
                        }
                      />
                    </div>
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            <Button
              variant="outline"
              className="h-10 rounded-xl bg-card shadow-sm font-semibold text-slate-700"
              onClick={() =>
                window.open(
                  `/workspace/print/barcodes?invoiceId=${invoice.id}`,
                  "_blank",
                )
              }>
              <QrCode className="h-4 w-4 mr-2" /> Barcodes
            </Button>

            <Button
              variant="outline"
              className="h-10 rounded-xl bg-card shadow-sm font-semibold text-slate-700"
              onClick={handleDownloadPdf}
              disabled={isDownloading}>
              {isDownloading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              PDF
            </Button>

            <Button
              className="h-10 px-6 bg-primary hover:bg-blue-700 text-white rounded-xl shadow-md font-semibold"
              onClick={() => window.print()}>
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
          </div>
        </div>

        {/* --- A4 INVOICE CONTAINER (PROFESSIONAL CLINICAL LOOK) --- */}
        <div
          id="invoice-container"
          className={`bg-card shadow-xl mt-8 mx-auto ${fontClass} text-foreground box-border p-[15mm] relative`}
          style={{ width: "210mm", minHeight: "297mm" }}>
          {/* DOCUMENT HEADER */}
          {config.showHeader && (
            <div className="flex justify-between items-start mb-8">
              {/* Lab Info (Left) */}
              <div className="flex items-start gap-4 max-w-[60%]">
                {config.showLogo && (
                  <div
                    className={`h-16 w-16 ${colors.bg} rounded-xl flex items-center justify-center text-3xl font-bold text-white shrink-0 shadow-sm`}>
                    {invoice.lab?.name?.charAt(0) || "L"}
                  </div>
                )}
                <div>
                  <h1 className="text-2xl font-bold text-foreground tracking-tight leading-none mb-2">
                    {invoice.lab?.name || "Laboratory Name"}
                  </h1>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-slate-400" />
                      {invoice.lab?.address || "Lab Address Not Provided"}
                    </p>
                    <div className="flex gap-4">
                      <p className="flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5 text-slate-400" />{" "}
                        {invoice.lab?.phone || "N/A"}
                      </p>
                      <p className="flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5 text-slate-400" />{" "}
                        {invoice.lab?.email || "N/A"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Invoice Meta (Right) */}
              <div className="text-right flex flex-col items-end">
                <h2
                  className={`text-2xl font-bold ${colors.text} uppercase tracking-wider mb-2`}>
                  Tax Invoice
                </h2>
                <div className="bg-card p-1 rounded-md border border-slate-100 mb-2">
                  <Barcode
                    value={invoice.invoiceNumber}
                    height={30}
                    width={1.2}
                    fontSize={12}
                    displayValue={false}
                    margin={0}
                  />
                </div>
                <table className="text-sm">
                  <tbody>
                    <tr>
                      <td className="text-muted-foreground pr-3 pb-1 text-right">
                        Invoice No:
                      </td>
                      <td className="font-mono font-bold text-foreground pb-1">
                        {invoice.invoiceNumber}
                      </td>
                    </tr>
                    <tr>
                      <td className="text-muted-foreground pr-3 pb-1 text-right">
                        Date:
                      </td>
                      <td className="font-semibold text-foreground pb-1">
                        {format(
                          new Date(invoice.createdAt),
                          "dd MMM yyyy, hh:mm a",
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div
            className={`h-1.5 w-full ${colors.bg} mb-8 rounded-full opacity-20`}
          />

          {/* PATIENT & REFERRAL INFO CARDS */}
          <div className="grid grid-cols-2 gap-6 mb-8">
            {/* Bill To Card */}
            <div className="border border-border rounded-xl p-4 bg-slate-50/50">
              <h3 className="text-xs font-bold text-muted-foreground/70 uppercase tracking-wider mb-3">
                Patient Details
              </h3>
              <p className="text-lg font-bold text-foreground mb-2">
                {invoice.patient?.name}
              </p>
              <table className="text-sm w-full">
                <tbody>
                  <tr>
                    <td className="text-muted-foreground py-1 w-24">Patient ID:</td>
                    <td className="font-medium text-foreground">
                      {invoice.patient?.patientId}
                    </td>
                  </tr>
                  <tr>
                    <td className="text-muted-foreground py-1">Age / Sex:</td>
                    <td className="font-medium text-foreground">
                      {invoice.patient?.age} {invoice.patient?.ageUnit} /{" "}
                      {invoice.patient?.gender}
                    </td>
                  </tr>
                  <tr>
                    <td className="text-muted-foreground py-1">Contact:</td>
                    <td className="font-medium text-foreground">
                      {invoice.patient?.phone}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Clinical Info Card */}
            <div className="border border-border rounded-xl p-4 bg-slate-50/50">
              <h3 className="text-xs font-bold text-muted-foreground/70 uppercase tracking-wider mb-3">
                Clinical Reference
              </h3>
              <table className="text-sm w-full">
                <tbody>
                  <tr>
                    <td className="text-muted-foreground py-1 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4" /> Referred By:
                    </td>
                    <td className="font-semibold text-foreground">
                      {invoice.doctor?.name || "Self Referral"}
                    </td>
                  </tr>
                  <tr>
                    <td className="text-muted-foreground py-1 flex items-center gap-2">
                      <Building2 className="w-4 h-4" /> Agency/Client:
                    </td>
                    <td className="font-semibold text-foreground">
                      {invoice.agency?.name || "N/A"}
                    </td>
                  </tr>
                  <tr>
                    <td className="text-muted-foreground py-1 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" /> Collection:
                    </td>
                    <td className="font-semibold text-foreground">
                      {invoice.collectedBy || "In-Lab"}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* SERVICES TABLE */}
          <div className="mb-8 min-h-[250px]">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr
                  className={`${colors.light} ${colors.text} border-y ${colors.border}`}>
                  <th className="py-3 px-4 text-left font-bold w-12">#</th>
                  <th className="py-3 px-4 text-left font-bold">
                    Investigation / Service Name
                  </th>
                  <th className="py-3 px-4 text-right font-bold w-32">
                    Unit Price
                  </th>
                  <th className="py-3 px-4 text-right font-bold w-32">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {invoice.items?.map((item: any, i: number) => (
                  <tr
                    key={item.id}
                    className="hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4 text-muted-foreground">{i + 1}</td>
                    <td className="py-3 px-4 font-semibold text-slate-800">
                      {item.description || "Laboratory Test"}
                    </td>
                    <td className="py-3 px-4 text-right text-muted-foreground">
                      ₹
                      {item.unitPrice?.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-foreground">
                      ₹
                      {item.total?.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* FINANCIALS & TERMS */}
          <div className="flex justify-between items-start pt-4">
            {/* Terms and Notes (Left) */}
            <div className="w-1/2 pr-8">
              <h4 className="text-xs font-bold text-muted-foreground/70 uppercase tracking-wider mb-2">
                Terms & Conditions
              </h4>
              <ul className="text-xs text-muted-foreground space-y-1.5 list-disc pl-4">
                <li>
                  All laboratory reports are subject to clinical correlation by
                  the referring physician.
                </li>
                <li>
                  Partial or pending payments must be cleared before report
                  generation.
                </li>
                <li>This is a computer-generated invoice.</li>
              </ul>
            </div>

            {/* Totals (Right) */}
            <div className="w-5/12 border border-border rounded-xl overflow-hidden">
              <div className="p-4 space-y-3 bg-card">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Gross Total</span>
                  <span className="font-semibold text-foreground">
                    ₹
                    {invoice.subtotal?.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
                {invoice.discount > 0 && (
                  <div className="flex justify-between items-center text-sm text-rose-600">
                    <span>Discount</span>
                    <span className="font-semibold">
                      - ₹
                      {invoice.discount?.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                )}
                {/* Add Taxes here if applicable in future */}
              </div>
              <div
                className={`${colors.light} p-4 border-t border-border flex justify-between items-center`}>
                <span className={`text-base font-bold ${colors.muted}`}>
                  Net Payable
                </span>
                <span className={`text-xl font-bold ${colors.text}`}>
                  ₹
                  {invoice.grandTotal?.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>

              {/* Payment Status Ribbon */}
              <div
                className={`text-center py-2 text-xs font-bold uppercase tracking-widest text-white ${invoice.status === "PAID" ? "bg-emerald-500" : "bg-amber-500"}`}>
                {invoice.status === "PAID"
                  ? "Payment Received"
                  : "Payment Pending"}
              </div>
            </div>
          </div>

          {/* AUTHENTICATION FOOTER */}
          {config.showSignature && (
            <div className="absolute bottom-[20mm] right-[20mm] text-right">
              <div className="w-48 border-b border-slate-400 mb-2 mx-auto"></div>
              <p className="text-sm font-bold text-slate-800">
                Authorized Signatory
              </p>
              <p className="text-xs text-muted-foreground">{invoice.lab?.name}</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
