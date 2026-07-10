"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Plus,
  Search,
  Download,
  Eye,
  Loader2,
  MapPin,
  Phone,
  Mail,
  TrendingUp,
  Clock,
  AlertCircle,
  FileText,
  ChevronRight,
  Filter,
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import toast from "react-hot-toast";

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
  }).format(amount);
};

export default function BillingPage() {
  /** 🔒 RULE 1: PRESERVE ALL LOGIC */
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [pdfData, setPdfData] = useState<any>(null);
  const hiddenInvoiceRef = useRef<HTMLDivElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["invoices", searchQuery, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        ...(searchQuery && { search: searchQuery }),
        ...(statusFilter !== "ALL" && { status: statusFilter }),
      });
      const response = await fetch(`/api/workspace/invoices?${params}`);
      if (!response.ok) throw new Error("Failed to fetch invoices");
      return response.json();
    },
  });

  useEffect(() => {
    if (pdfData && hiddenInvoiceRef.current) {
      const generate = async () => {
        try {
          const html2pdf = (await import("html2pdf.js")).default;
          const opt = {
            margin: 0,
            filename: `Invoice-${pdfData.invoiceNumber}.pdf`,
            image: { type: "jpeg", quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
          };
          await html2pdf().set(opt).from(hiddenInvoiceRef.current).save();
          toast.success("Downloaded successfully");
        } catch (e) {
          console.error(e);
          toast.error("Failed to generate PDF");
        } finally {
          setPdfData(null);
          setDownloadingId(null);
        }
      };
      setTimeout(generate, 500);
    }
  }, [pdfData]);

  const handleDownloadClick = async (id: string) => {
    setDownloadingId(id);
    try {
      const res = await fetch(`/api/workspace/invoices/${id}`);
      if (!res.ok) throw new Error("Fetch failed");
      const fullInvoice = await res.json();
      setPdfData(fullInvoice);
    } catch (e) {
      toast.error("Could not fetch invoice details");
      setDownloadingId(null);
    }
  };

  /** 🎨 RULE 2: REIMAGINED UI */
  const getStatusBadge = (status: string) => {
    const configs: Record<string, { class: string; icon: any }> = {
      PENDING: {
        class: "bg-amber-50 text-amber-700 border-amber-100",
        icon: Clock,
      },
      PAID: {
        class: "bg-emerald-50 text-emerald-700 border-emerald-100",
        icon: CheckCircle,
      },
      OVERDUE: {
        class: "bg-rose-50 text-rose-700 border-rose-100",
        icon: AlertCircle,
      },
      CANCELLED: {
        class: "bg-muted text-muted-foreground border-border",
        icon: XCircle,
      },
    };
    const config = configs[status] || configs.PENDING;
    const Icon = config.icon;

    return (
      <Badge
        variant="outline"
        className={`gap-1.5 font-bold uppercase tracking-wider text-[10px] ${config.class}`}>
        {status}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-8 lg:p-12 font-sans selection:bg-emerald-100">
      {/* BACKGROUND DECOR */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-40">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-100 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-100 blur-[120px] rounded-full" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto space-y-10">
        {/* HEADER SECTION */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-card border border-border text-muted-foreground shadow-sm">
              <FileText className="w-4 h-4 text-emerald-500" />
              <span className="text-xs font-bold uppercase tracking-widest">
                Revenue Center
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-foreground">
              Billing{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-blue-600">
                &
              </span>{" "}
              Ledger
            </h1>
          </div>

          <Link href="/workspace/registration">
            <Button className="h-14 px-8 bg-slate-900 hover:bg-black text-white rounded-2xl shadow-xl shadow-slate-200 transition-all active:scale-95 group">
              <Plus className="mr-2 h-5 w-5 group-hover:rotate-90 transition-transform" />
              <span className="font-bold text-lg">Generate Invoice</span>
            </Button>
          </Link>
        </header>

        {/* KPI SECTION */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              label: "Total Revenue",
              value: data?.stats?.totalRevenue,
              sub: "All time",
              icon: TrendingUp,
              color: "emerald",
            },
            {
              label: "Unpaid Balance",
              value: data?.stats?.pendingAmount,
              sub: `${data?.stats?.pendingCount || 0} Invoices`,
              icon: Clock,
              color: "amber",
            },
            {
              label: "Monthly Growth",
              value: data?.stats?.monthlyRevenue,
              sub: "Current month",
              icon: FileText,
              color: "blue",
            },
            {
              label: "Arrears",
              value: data?.stats?.overdueAmount,
              sub: `${data?.stats?.overdueCount || 0} Overdue`,
              icon: AlertCircle,
              color: "rose",
            },
          ].map((stat, i) => (
            <Card
              key={i}
              className="border-none shadow-sm bg-card overflow-hidden group">
              <CardContent className="p-0">
                <div className="p-6 space-y-4">
                  <div className="flex justify-between items-start">
                    <div
                      className={`p-2 rounded-xl bg-${stat.color}-50 text-${stat.color}-600`}>
                      <stat.icon className="w-5 h-5" />
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:translate-x-1 transition-transform" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      {stat.label}
                    </p>
                    <h3
                      className={`text-2xl font-black text-foreground tabular-nums`}>
                      {formatCurrency(stat.value || 0)}
                    </h3>
                    <p className="text-xs font-medium text-muted-foreground italic">
                      {stat.sub}
                    </p>
                  </div>
                </div>
                <div className={`h-1 w-full bg-${stat.color}-500/10`}>
                  <div
                    className={`h-full bg-${stat.color}-500 transition-all duration-1000`}
                    style={{ width: "40%" }}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </section>

        {/* MAIN LEDGER SECTION */}
        <section className="space-y-6">
          {/* TOOLBAR */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/70 group-focus-within:text-emerald-500 transition-colors" />
              <Input
                placeholder="Search by ID or Patient Name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-14 pl-12 bg-card border-none shadow-sm rounded-2xl text-lg font-medium placeholder:text-slate-300 focus-visible:ring-emerald-500/20 transition-all"
              />
            </div>
            <div className="relative min-w-[200px]">
              <Filter className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full h-14 pl-11 pr-4 bg-card border-none shadow-sm rounded-2xl text-sm font-bold appearance-none focus:ring-2 focus:ring-emerald-500/20 outline-none">
                <option value="ALL">All Transactions</option>
                <option value="PENDING">Pending</option>
                <option value="PAID">Settled</option>
                <option value="OVERDUE">Delinquent</option>
              </select>
            </div>
          </div>

          {/* TABLE DATA */}
          <Card className="border-none shadow-sm bg-card rounded-[32px] overflow-hidden">
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-24 gap-4">
                  <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs font-black uppercase tracking-widest text-muted-foreground/70 italic">
                    Syncing Ledger...
                  </p>
                </div>
              ) : data?.invoices?.length === 0 ? (
                <div className="text-center py-24">
                  <div className="inline-flex p-6 rounded-full bg-muted/30 mb-4">
                    <Search className="w-12 h-12 text-slate-200" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground">
                    No records found
                  </h3>
                  <p className="text-muted-foreground">
                    Adjust your filters to see more results
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-slate-50/50 border-b border-slate-100">
                        <th className="px-8 py-5 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">
                          Reference #
                        </th>
                        <th className="px-8 py-5 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">
                          Patient Detail
                        </th>
                        <th className="px-8 py-5 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">
                          Financials
                        </th>
                        <th className="px-8 py-5 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">
                          Date Logged
                        </th>
                        <th className="px-8 py-5 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">
                          Status
                        </th>
                        <th className="px-8 py-5 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {data?.invoices?.map((invoice: any) => (
                        <tr
                          key={invoice.id}
                          className="group hover:bg-muted/50/80 transition-colors">
                          <td className="px-8 py-5">
                            <span className="font-mono text-sm font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg">
                              {invoice.invoiceNumber}
                            </span>
                          </td>
                          <td className="px-8 py-5">
                            <div className="font-bold text-foreground">
                              {invoice.patient?.name || "Unknown"}
                            </div>
                            <div className="text-[10px] font-black uppercase text-slate-400">
                              PID: {invoice.patient?.patientId || "N/A"}
                            </div>
                          </td>
                          <td className="px-8 py-5">
                            <div className="flex flex-col">
                              <span className="font-black text-foreground tabular-nums">
                                {formatCurrency(invoice.grandTotal)}
                              </span>
                              {invoice.discount > 0 && (
                                <span className="text-[10px] font-black text-rose-500 bg-rose-50 w-fit px-1.5 rounded uppercase mt-0.5">
                                  - {formatCurrency(invoice.discount)} Saved
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-8 py-5 text-sm font-medium text-muted-foreground">
                            {format(new Date(invoice.createdAt), "dd MMM yyyy")}
                          </td>
                          <td className="px-8 py-5 text-right">
                            {getStatusBadge(invoice.status)}
                          </td>
                          <td className="px-8 py-5 text-right">
                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Link href={`/workspace/billing/${invoice.id}`}>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-10 w-10 rounded-xl text-muted-foreground/70 hover:text-emerald-600 hover:bg-emerald-50">
                                  <Eye className="h-5 w-5" />
                                </Button>
                              </Link>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-10 w-10 rounded-xl text-muted-foreground/70 hover:text-primary hover:bg-primary/10"
                                onClick={() => handleDownloadClick(invoice.id)}
                                disabled={downloadingId === invoice.id}>
                                {downloadingId === invoice.id ? (
                                  <Loader2 className="h-5 w-5 animate-spin" />
                                ) : (
                                  <Download className="h-5 w-5" />
                                )}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* --- PDF TEMPLATE (STYLIZED) --- */}
        <div className="absolute top-0 left-[-9999px]">
          {pdfData && (
            <div
              ref={hiddenInvoiceRef}
              className="bg-card p-16 text-foreground font-sans"
              style={{ width: "210mm", minHeight: "297mm" }}>
              <div className="flex justify-between items-start mb-16">
                <div>
                  <h1 className="text-3xl font-black uppercase tracking-tighter text-foreground mb-2">
                    {pdfData.lab?.name || "Patholab"}
                  </h1>
                  <div className="text-[11px] font-bold text-muted-foreground/70 uppercase leading-loose">
                    <p className="flex items-center gap-2">
                      <MapPin className="h-3 w-3" /> {pdfData.lab?.address},{" "}
                      {pdfData.lab?.city}
                    </p>
                    <p className="flex items-center gap-2">
                      <Phone className="h-3 w-3" /> {pdfData.lab?.phone}
                    </p>
                    <p className="flex items-center gap-2">
                      <Mail className="h-3 w-3" /> {pdfData.lab?.email}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <h2 className="text-6xl font-black text-slate-50 tracking-tighter leading-none mb-4 select-none uppercase">
                    Invoice
                  </h2>
                  <p className="text-xl font-black text-emerald-600 mb-2 tabular-nums">
                    #{pdfData.invoiceNumber}
                  </p>
                  <div className="inline-block bg-slate-900 text-white px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest">
                    {pdfData.status}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-20 mb-20 py-12 border-y border-slate-100">
                <div>
                  <p className="text-[10px] font-black text-muted-foreground/70 uppercase tracking-[0.2em] mb-4">
                    Patient Profile
                  </p>
                  <h3 className="text-2xl font-black text-foreground mb-2">
                    {pdfData.patient?.name}
                  </h3>
                  <div className="text-xs font-bold text-muted-foreground space-y-1">
                    <p>
                      <span className="text-slate-300 w-16 inline-block uppercase tracking-tighter">
                        PID
                      </span>{" "}
                      {pdfData.patient?.patientId}
                    </p>
                    <p>
                      <span className="text-slate-300 w-16 inline-block uppercase tracking-tighter">
                        Contact
                      </span>{" "}
                      {pdfData.patient?.phone}
                    </p>
                  </div>
                </div>
                <div className="flex justify-end gap-16">
                  <div className="text-right">
                    <p className="text-[10px] font-black text-muted-foreground/70 uppercase tracking-widest mb-2">
                      Issue Date
                    </p>
                    <p className="text-sm font-black text-foreground">
                      {format(new Date(pdfData.createdAt), "dd MMM yyyy")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-muted-foreground/70 uppercase tracking-widest mb-2">
                      Issue Time
                    </p>
                    <p className="text-sm font-black text-foreground">
                      {format(new Date(pdfData.createdAt), "h:mm a")}
                    </p>
                  </div>
                </div>
              </div>

              <table className="w-full mb-20">
                <thead>
                  <tr className="border-b-2 border-slate-900">
                    <th className="py-4 text-left text-[10px] font-black text-foreground uppercase tracking-widest">
                      Service Description
                    </th>
                    <th className="py-4 text-right text-[10px] font-black text-foreground uppercase tracking-widest">
                      Unit Price
                    </th>
                    <th className="py-4 text-right text-[10px] font-black text-foreground uppercase tracking-widest">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pdfData.items?.map((item: any, i: number) => (
                    <tr key={i}>
                      <td className="py-6 font-bold text-slate-800">
                        {item.description}
                      </td>
                      <td className="py-6 text-right font-medium text-muted-foreground tabular-nums">
                        ₹{item.unitPrice}
                      </td>
                      <td className="py-6 text-right font-black text-foreground tabular-nums text-lg">
                        ₹{item.total}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="flex justify-end pt-12 border-t-4 border-slate-900">
                <div className="w-80 space-y-4">
                  <div className="flex justify-between items-center text-xs font-bold uppercase tracking-widest text-slate-400">
                    <span>Subtotal</span>
                    <span className="text-foreground">₹{pdfData.subtotal}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs font-bold uppercase tracking-widest text-rose-500">
                    <span>Discount Applied</span>
                    <span>- ₹{pdfData.discount}</span>
                  </div>
                  <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                    <span className="text-lg font-black uppercase tracking-[0.2em] text-foreground">
                      Total Payable
                    </span>
                    <span className="text-3xl font-black text-emerald-600 tabular-nums">
                      ₹{pdfData.grandTotal}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-40 text-center">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">
                  Generated via patholab.cloud system
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CheckCircle(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

function XCircle(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  );
}
