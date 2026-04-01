"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Printer,
  ArrowLeft,
  Settings2,
  Loader2,
  Phone,
  Mail,
  LayoutTemplate,
  Palette,
  Type,
  Download,
  QrCode,
  Timer,
  XCircle,
  FileText,
  User,
  Activity,
  CheckCircle2,
  ShieldCheck,
  History,
  ChevronRight,
  MousePointer2
} from "lucide-react";
import { format } from "date-fns";
import toast from "react-hot-toast";
import Barcode from "react-barcode";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
  /** 🔒 RULE 1: PRESERVE ALL LOGIC */
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const invoiceId = params.id as string;
  const [isDownloading, setIsDownloading] = useState(false);
  const [countdown, setCountdown] = useState(15);
  const [isRedirectActive, setIsRedirectActive] = useState(true);

  const [config, setConfig] = useState({
    showHeader: true,
    showFooter: true,
    showLogo: true,
    showSignature: true,
    accentColor: "blue",
    fontStyle: "sans",
    headerStyle: "standard",
    density: "comfortable",
  });

  const [customNote, setCustomNote] = useState("");

  useEffect(() => {
    if (!isRedirectActive) return;
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          router.push("/lab-owner/patients");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isRedirectActive, router]);

  const { data: invoice, isLoading } = useQuery({
    queryKey: ["invoice", invoiceId],
    queryFn: async () => {
      const res = await fetch(`/api/lab-owner/invoices/${invoiceId}`);
      if (!res.ok) throw new Error("Failed to load invoice");
      return res.json();
    },
  });

  const statusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      const res = await fetch(`/api/lab-owner/invoices/${invoiceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: (data) => {
      toast.success(`Marked as ${data.status}`);
      queryClient.invalidateQueries({ queryKey: ["invoice", invoiceId] });
    },
    onError: () => toast.error("Update failed"),
  });

  const handleDownloadPdf = async () => {
    setIsDownloading(true);
    setIsRedirectActive(false);
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
      toast.success("PDF Downloaded");
    } catch (e) {
      toast.error("Failed to generate PDF");
    } finally {
      setIsDownloading(false);
    }
  };

  if (isLoading) return (
    <div className="h-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
        <p className="text-xs font-black uppercase tracking-widest text-slate-400">Loading secure document...</p>
      </div>
    </div>
  );

  if (!invoice) return (
    <div className="h-screen flex items-center justify-center font-bold text-rose-500 uppercase tracking-widest bg-slate-50">
      <XCircle className="mr-2 h-5 w-5" /> Invoice not found
    </div>
  );

  const colors = {
    blue: { bg: "bg-indigo-600", text: "text-indigo-600", light: "bg-indigo-50", border: "border-indigo-100" },
    green: { bg: "bg-emerald-600", text: "text-emerald-600", light: "bg-emerald-50", border: "border-emerald-100" },
    black: { bg: "bg-slate-900", text: "text-slate-900", light: "bg-slate-100", border: "border-slate-200" },
    violet: { bg: "bg-violet-600", text: "text-violet-600", light: "bg-violet-50", border: "border-violet-100" },
  }[config.accentColor as "blue" | "green" | "black" | "violet"] || { bg: "bg-indigo-600", text: "text-indigo-600", light: "bg-indigo-50", border: "border-indigo-100" };

  const fontClass = config.fontStyle === "serif" ? "font-serif" : "font-sans";
  const densityClass = config.density === "compact" ? "py-1.5 text-[11px]" : "py-4 text-sm";

  return (
    <>
      <style jsx global>{`
        @media print {
          @page { size: A4 portrait; margin: 0; }
          body * { visibility: hidden; }
          #invoice-container, #invoice-container * { visibility: visible; }
          #invoice-container {
            position: absolute; left: 0; top: 0; width: 100%; height: auto;
            margin: 0; padding: 15mm !important; background: white;
            box-shadow: none !important; border: none !important;
          }
        }
      `}</style>

      <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 flex flex-col items-center pb-20 print:bg-white print:p-0">
        
        {/* --- 🆕 AUTO-REDIRECT BANNER --- */}
        {isRedirectActive && (
          <div className="fixed top-0 left-0 right-0 bg-slate-900/95 backdrop-blur-md text-white z-[100] py-2.5 px-6 flex justify-between items-center border-b border-white/10 print:hidden animate-in slide-in-from-top duration-500">
            <div className="flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-indigo-500 animate-ping" />
              <p className="text-xs font-bold uppercase tracking-widest opacity-80">
                Auto-Routing to Worklist in <span className="text-indigo-400 font-black text-sm">{countdown}s</span>
              </p>
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 text-white"
              onClick={() => setIsRedirectActive(false)}>
              <XCircle className="h-3.5 w-3.5 mr-1.5" /> Stop Timer
            </Button>
          </div>
        )}

        {/* --- MODERN DASHBOARD TOOLBAR --- */}
        <div className={`w-full max-w-[210mm] flex flex-col md:flex-row justify-between items-center mt-16 mb-8 px-4 md:px-0 gap-6 print:hidden transition-all ${isRedirectActive ? "translate-y-4" : "translate-y-0"}`}>
          <div className="flex items-center gap-4 w-full md:w-auto">
            <Button
              variant="outline"
              className="h-12 rounded-2xl bg-white border-none shadow-sm hover:shadow-md transition-all active:scale-95"
              onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" /> <span className="font-bold">Exit Preview</span>
            </Button>
            <div className="h-12 w-px bg-slate-200" />
            <div className="flex flex-col">
              <h1 className="text-sm font-black uppercase tracking-tighter text-slate-400">Document ID</h1>
              <p className="font-mono text-sm font-bold text-slate-900">INV-{invoice.invoiceNumber}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 w-full md:w-auto">
            {/* Status Switcher Styled */}
            <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-2xl shadow-sm border border-slate-100">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Payment</span>
              <Select
                value={invoice.status}
                onValueChange={(val) => {
                  setIsRedirectActive(false);
                  statusMutation.mutate(val);
                }}
                disabled={statusMutation.isPending}>
                <SelectTrigger className={`h-8 border-none shadow-none text-xs font-black uppercase w-[90px] focus:ring-0 ${invoice.status === "PAID" ? "text-emerald-600" : "text-amber-600"}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-none shadow-2xl">
                  <SelectItem value="PENDING" className="text-amber-600 font-bold">Pending</SelectItem>
                  <SelectItem value="PAID" className="text-emerald-600 font-bold">Settled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="h-12 w-12 rounded-2xl bg-white border-none shadow-sm"><Settings2 className="h-5 w-5" /></Button>
              </SheetTrigger>
              <SheetContent className="overflow-y-auto w-[400px] border-none shadow-2xl rounded-l-[32px] p-8">
                <SheetHeader className="mb-8">
                  <SheetTitle className="text-2xl font-black tracking-tight">Invoice <span className="text-indigo-600">Studio</span></SheetTitle>
                  <p className="text-xs font-medium text-slate-500">Personalize document aesthetics and data density.</p>
                </SheetHeader>
                <div className="space-y-10">
                  <div className="space-y-4">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2"><Palette className="h-4 w-4" /> Accent Palette</Label>
                    <div className="flex gap-4">
                      {["blue", "green", "violet", "black"].map((c) => (
                        <button
                          key={c}
                          onClick={() => setConfig({ ...config, accentColor: c })}
                          className={`h-10 w-10 rounded-xl transition-all ${config.accentColor === c ? 'ring-4 ring-slate-100 scale-110 shadow-lg' : 'opacity-60'} ${
                            c === 'blue' ? 'bg-indigo-600' : c === 'green' ? 'bg-emerald-600' : c === 'violet' ? 'bg-violet-600' : 'bg-slate-900'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <Separator className="opacity-50" />
                  <div className="space-y-6">
                     <div className="flex items-center justify-between">
                        <Label className="text-[11px] font-bold uppercase tracking-wide">Brand Header</Label>
                        <Switch checked={config.showHeader} onCheckedChange={(v) => setConfig({ ...config, showHeader: v })} />
                     </div>
                     <div className="flex items-center justify-between">
                        <Label className="text-[11px] font-bold uppercase tracking-wide">Signature Block</Label>
                        <Switch checked={config.showSignature} onCheckedChange={(v) => setConfig({ ...config, showSignature: v })} />
                     </div>
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            <Button variant="outline" className="h-12 px-6 rounded-2xl bg-white border-none shadow-sm font-bold text-slate-600 active:scale-95 transition-all" onClick={() => window.open(`/lab-owner/print/barcodes?invoiceId=${invoice.id}`, "_blank")}>
              <QrCode className="h-4 w-4 mr-2" /> Barcodes
            </Button>

            <Button className="h-14 px-8 bg-slate-900 hover:bg-black text-white rounded-2xl shadow-xl shadow-slate-200 flex items-center gap-3 group" onClick={() => window.print()}>
              <Printer className="h-5 w-5 group-hover:-translate-y-1 transition-transform" /> 
              <span className="font-bold text-lg leading-none">Print Invoice</span>
            </Button>
          </div>
        </div>

        {/* --- A4 INVOICE CONTAINER --- */}
        <div
          id="invoice-container"
          className={`bg-white shadow-[0_40px_100px_rgba(0,0,0,0.08)] mx-auto ${fontClass} text-slate-900 leading-normal box-border p-[20mm] relative overflow-hidden`}
          style={{ width: "210mm", minHeight: "297mm" }}>
          
          {/* Subtle Background Mark for patholab.cloud */}
          <div className="absolute top-[-5%] right-[-5%] w-[300px] h-[300px] bg-slate-50 rounded-full -z-10 blur-3xl opacity-50" />

          {/* DOCUMENT HEADER */}
          {config.showHeader && (
            <div className={`mb-12 ${config.headerStyle === "centered" ? "text-center" : "flex justify-between items-start"}`}>
              <div className={`${config.headerStyle === "centered" ? "mb-10" : "w-1/2"}`}>
                {config.showLogo && (
                  <div className={`h-16 w-16 ${colors.light} rounded-2xl flex items-center justify-center text-3xl font-black ${colors.text} mb-4 ${config.headerStyle === "centered" ? "mx-auto" : ""}`}>
                    {invoice.lab?.name?.charAt(0) || "L"}
                  </div>
                )}
                <h1 className={`text-3xl font-black uppercase tracking-tighter ${colors.text}`}>
                  {invoice.lab?.name || "Laboratory Name"}
                </h1>
                <div className="text-[11px] font-bold text-slate-400 mt-2 space-y-1.5 uppercase tracking-tighter leading-tight">
                  <p className="flex items-center gap-2">
                    <MapPin className="h-3 w-3 opacity-50" /> {invoice.lab?.address}, {invoice.lab?.city}
                  </p>
                  <div className={`flex gap-4 ${config.headerStyle === "centered" ? "justify-center" : ""}`}>
                    <p className="flex items-center gap-1.5"><Phone className="h-3 w-3 opacity-50" /> {invoice.lab?.phone}</p>
                    <p className="flex items-center gap-1.5"><Mail className="h-3 w-3 opacity-50" /> {invoice.lab?.email}</p>
                  </div>
                </div>
              </div>

              <div className={`${config.headerStyle === "centered" ? "" : "text-right w-1/2"} flex flex-col items-end`}>
                <h2 className="text-7xl font-black text-slate-50 tracking-tighter leading-none mb-4 uppercase select-none">
                  Invoice
                </h2>
                <div className="mb-4 bg-white p-1 rounded-lg ring-1 ring-slate-100">
                  <Barcode value={invoice.invoiceNumber} height={40} width={1.4} fontSize={14} displayValue={false} margin={5} />
                </div>
                <div className="space-y-1">
                  <p className={`font-mono text-xl font-black ${colors.text}`}>#{invoice.invoiceNumber}</p>
                  <Badge className={`rounded h-6 text-[10px] font-black uppercase tracking-widest border-none ${invoice.status === "PAID" ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                    {invoice.status === "PAID" ? 'Full Settlement' : 'Payment Awaiting'}
                  </Badge>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-12 mb-12 py-10 border-y border-slate-100">
            <div className="col-span-1">
              <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mb-4">Bill To</p>
              <h3 className="text-xl font-black text-slate-800 tracking-tight mb-2">{invoice.patient?.name}</h3>
              <div className="text-[11px] font-bold text-slate-500 space-y-1 leading-relaxed">
                <p><span className="text-slate-300 w-16 inline-block uppercase tracking-tighter">ID</span> {invoice.patient?.patientId}</p>
                <p><span className="text-slate-300 w-16 inline-block uppercase tracking-tighter">Demog</span> {invoice.patient?.age} {invoice.patient?.ageUnit} / {invoice.patient?.gender}</p>
                <p><span className="text-slate-300 w-16 inline-block uppercase tracking-tighter">Contact</span> {invoice.patient?.phone}</p>
              </div>
            </div>

            <div className="col-span-2 grid grid-cols-2 gap-y-6">
              {[
                { icon: History, label: "Booking Date", value: format(new Date(invoice.createdAt), "dd MMM, yyyy") },
                { icon: ShieldCheck, label: "Referring MD", value: invoice.doctor?.name || "Self Referral" },
                { icon: MousePointer2, label: "Payment Mode", value: invoice.paymentMode || "Direct Cash" },
                { icon: CheckCircle2, label: "Collection", value: invoice.collectedBy || "In-Lab" },
              ].map((item, i) => (
                <div key={i} className="space-y-1.5">
                  <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest flex items-center gap-1.5">
                    <item.icon className="h-2.5 w-2.5" /> {item.label}
                  </p>
                  <p className="text-[11px] font-black text-slate-700 uppercase tracking-tight">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* TRANSACTION LEDGER */}
          <div className="mb-12 min-h-[300px]">
            <table className="w-full">
              <thead>
                <tr className={`border-b-2 border-slate-900 text-slate-900 uppercase text-[10px] font-black tracking-widest`}>
                  <th className="py-4 px-2 text-left w-12">#</th>
                  <th className="py-4 px-2 text-left">Service Description</th>
                  <th className="py-4 px-2 text-right">Unit Rate</th>
                  <th className="py-4 px-2 text-right">Line Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoice.items?.map((item: any, i: number) => (
                  <tr key={item.id} className="group">
                    <td className={`px-2 font-mono font-bold text-slate-300 ${densityClass}`}>{i + 1}</td>
                    <td className={`px-2 font-black text-slate-700 ${densityClass}`}>{item.description || "Investigation Service"}</td>
                    <td className={`px-2 text-right font-medium text-slate-400 tabular-nums ${densityClass}`}>₹{item.unitPrice?.toLocaleString()}</td>
                    <td className={`px-2 text-right font-black text-slate-900 tabular-nums ${densityClass}`}>₹{item.total?.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* FINANCIAL SUMMARY */}
          <div className="flex justify-between items-start pt-10 border-t-2 border-slate-900">
             <div className="w-1/2 space-y-4">
                <div className="p-4 bg-slate-50 rounded-2xl">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Technical Disclosures</p>
                   <ul className="text-[9px] font-bold text-slate-500 space-y-1 list-disc list-inside leading-relaxed uppercase tracking-tighter">
                      <li>Report validity depends on clinical correlation.</li>
                      <li>Samples processed in ISO certified environment.</li>
                      <li>Document strictly for patient use & medical review.</li>
                   </ul>
                </div>
                {customNote && (
                  <div className="p-4 border-l-4 border-slate-200 italic text-[11px] font-medium text-slate-500">
                    "{customNote}"
                  </div>
                )}
             </div>

             <div className="w-1/3 space-y-3">
                <div className="flex justify-between items-center text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                  <span>Gross Subtotal</span>
                  <span className="text-slate-900 tabular-nums">₹{invoice.subtotal?.toLocaleString()}</span>
                </div>
                {invoice.discount > 0 && (
                  <div className="flex justify-between items-center text-[11px] font-black text-rose-500 uppercase tracking-widest">
                    <span>Discount Benefits</span>
                    <span className="tabular-nums">- ₹{invoice.discount?.toLocaleString()}</span>
                  </div>
                )}
                <Separator className="bg-slate-200" />
                <div className={`flex justify-between items-center font-black ${colors.text} text-2xl tracking-tighter`}>
                  <span>Total Due</span>
                  <span className="tabular-nums">₹{invoice.grandTotal?.toLocaleString()}</span>
                </div>
                <div className="pt-2 text-right">
                  <p className="text-[8px] font-black uppercase text-slate-300 tracking-widest">Includes all relevant laboratory cess</p>
                </div>
             </div>
          </div>

          {/* AUTHENTICATION FOOTER */}
          <div className="mt-auto grid grid-cols-2 gap-20 items-end pt-16">
            <div className="flex items-center gap-4 group opacity-10 print:hidden">
               <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-500">
                  <Activity className="h-5 w-5" />
               </div>
               <div>
                  <p className="text-[10px] font-black uppercase tracking-widest">Internal Hash</p>
                  <p className="text-[9px] font-mono text-slate-400">{invoiceId.substring(0, 24)}</p>
               </div>
            </div>

            {config.showSignature && (
              <div className="text-right space-y-4">
                <div className="inline-flex flex-col items-center border-t border-slate-300 pt-3 min-w-[200px]">
                  <p className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em] leading-none mb-1">Laboratory Director</p>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter italic">Authorized Digital Endorsement</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}