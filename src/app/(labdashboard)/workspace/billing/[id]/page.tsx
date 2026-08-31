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
  FileText,
  Receipt,
  Thermometer,
} from "lucide-react";
import {
  InvoiceTemplateSelector,
  type InvoiceTemplateVariant,
} from "@/components/billing/InvoiceTemplateSelector";
import InvoiceActions from "./invoice-actions";
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
  const [templateVariant, setTemplateVariant] =
    useState<InvoiceTemplateVariant>("a4-full");

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
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm font-semibold text-slate-500">
            Loading secure document...
          </p>
        </div>
      </div>
    );

  if (!invoice)
    return (
      <div className="h-screen flex items-center justify-center font-bold text-rose-500 bg-slate-50">
        <XCircle className="mr-2 h-6 w-6" /> Invoice not found
      </div>
    );

  const colors = {
    blue: {
      bg: "bg-primary",
      text: "text-primary",
      light: "bg-blue-50",
      border: "border-primary",
      muted: "text-primary",
    },
    green: {
      bg: "bg-primary",
      text: "text-primary",
      light: "bg-emerald-50",
      border: "border-emerald-600",
      muted: "text-primary",
    },
    black: {
      bg: "bg-slate-900",
      text: "text-slate-900",
      light: "bg-slate-100",
      border: "border-slate-900",
      muted: "text-slate-700",
    },
    violet: {
      bg: "bg-primary",
      text: "text-violet-600",
      light: "bg-violet-50",
      border: "border-violet-600",
      muted: "text-violet-700",
    },
  }[config.accentColor as "blue" | "green" | "black" | "violet"] || {
    bg: "bg-primary",
    text: "text-primary",
    light: "bg-blue-50",
    border: "border-primary",
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

      <div className="min-h-screen bg-slate-50 flex flex-col items-center pb-20 print:bg-white print:p-0">
        {/* --- STICKY TOOLBAR --- */}
        <div className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-xl border-b border-slate-200 px-4 md:px-8 py-3 flex flex-col md:flex-row justify-between items-center gap-4 print:hidden shadow-sm">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <Button
              variant="outline"
              className="h-10 rounded-xl bg-white shadow-sm hover:bg-slate-50 transition-all text-slate-700"
              onClick={() => router.push("/workspace/patients")}>
              <Users className="h-4 w-4 mr-2 text-slate-500" />
              Patient Worklist
            </Button>
            <div className="h-6 w-px bg-slate-200 hidden md:block" />
            <div className="hidden md:flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Invoice Record
              </span>
              <span className="font-mono text-sm font-bold text-slate-900">
                #{invoice.invoiceNumber}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 w-full md:w-auto">
            {/* Status Switcher */}
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl shadow-sm border border-slate-200">
              <span className="text-xs font-semibold text-slate-500 mr-1">
                Status:
              </span>
              <Select
                value={invoice.status}
                onValueChange={(val) => statusMutation.mutate(val)}
                disabled={statusMutation.isPending}>
                <SelectTrigger
                  className={`h-8 border-none shadow-none text-xs font-bold w-[110px] focus:ring-0 ${invoice.status === "PAID" ? "text-primary bg-emerald-50" : "text-amber-600 bg-amber-50"}`}>
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
                    className="text-primary font-bold">
                    Paid
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  className="h-10 w-10 rounded-xl bg-white shadow-sm">
                  <Settings2 className="h-4 w-4 text-slate-600" />
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
                    <Label className="text-xs font-semibold text-slate-500 flex items-center gap-2">
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
                                ? "bg-primary"
                                : c === "violet"
                                  ? "bg-primary"
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
              className="h-10 rounded-xl bg-white shadow-sm font-semibold text-slate-700"
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
              className="h-10 rounded-xl bg-white shadow-sm font-semibold text-slate-700"
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
              className="h-10 px-6 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-md font-semibold"
              onClick={() => window.print()}>
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
          </div>
        </div>

        {/* ✅ SHARE ACTIONS: WhatsApp, Email, Server-side PDF download */}
        <div className="mt-4">
          <InvoiceActions
            invoiceId={invoice?.id}
            invoiceNumber={invoice?.invoiceNumber}
            patientName={invoice?.patient?.name}
            patientPhone={invoice?.patient?.phone}
            patientEmail={invoice?.patient?.email}
          />
        </div>

        {/* --- INVOICE TEMPLATE SELECTOR + RENDERER --- */}
        <div
          id="invoice-container"
          className="mt-8 mx-auto w-full flex flex-col items-center">
          <InvoiceTemplateSelector
            invoice={invoice}
            lab={invoice.lab}
            patient={invoice.patient}
            items={invoice.items || []}
            tests={invoice.tests || []}
          />
        </div>
      </div>
    </>
  );
}
