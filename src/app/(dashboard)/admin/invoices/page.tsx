"use client";

import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  FileText,
  Download,
  Filter,
  Search,
  Settings,
  Printer,
  Eye,
  Save,
  Building2,
  Wallet,
} from "lucide-react";
import { format } from "date-fns";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import toast from "react-hot-toast";

// UI
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CSVExportButton } from "@/components/admin/CSVExportButton";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";

// --- UTILS ---
const formatCurrency = (val: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(
    val,
  );

export default function AdminInvoicesPage() {
  const [activeTab, setActiveTab] = useState("list");

  return (
    <div className="space-y-6 p-4 md:p-8 min-h-screen bg-slate-50/50 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-2">
            <ReceiptIcon className="h-8 w-8 text-primary" /> Tax Invoices
          </h1>
          <p className="text-muted-foreground font-medium mt-1">
            Manage billing, taxation, and global invoice templates for Wallet
            Recharges.
          </p>
        </div>
        <div className="flex gap-2">
          <CSVExportButton resource="invoices" label="Export Invoices" filters={{ statuses: ['PAID', 'PENDING', 'PARTIAL', 'CANCELLED'] }} />
          <Button
            variant={activeTab === "list" ? "default" : "outline"}
            className={
              activeTab === "list" ? "bg-primary hover:bg-primary/90" : ""
            }
            onClick={() => setActiveTab("list")}>
            <FileText className="mr-2 h-4 w-4" /> All Invoices
          </Button>
          <Button
            variant={activeTab === "settings" ? "default" : "outline"}
            className={
              activeTab === "settings"
                ? "bg-primary hover:bg-primary/90"
                : ""
            }
            onClick={() => setActiveTab("settings")}>
            <Settings className="mr-2 h-4 w-4" /> Invoice Builder
          </Button>
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4">
        <TabsContent value="list">
          <InvoicesList />
        </TabsContent>
        <TabsContent value="settings">
          <InvoiceBuilder />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Custom Receipt Icon wrapper
function ReceiptIcon(props: any) {
  return <FileText {...props} />;
}

// ==========================================
// COMPONENT 1: INVOICES LIST (DataTable)
// ==========================================
function InvoicesList() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-invoices", page, search, status],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "50",
        search,
        status,
        type: "RECHARGE", // Fetch only Wallet Recharges (which are the real invoices)
      });
      // Assuming your backend maps /api/admin/invoices to return WalletTransactions
      const res = await fetch(`/api/admin/invoices?${params}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  return (
    <Card className="border-border shadow-sm rounded-2xl bg-card overflow-hidden">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-center bg-slate-50/50 p-4 border-b border-slate-100">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by Lab Name or Invoice ID..."
            className="pl-9 rounded-xl bg-card border-border focus:border-emerald-500"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-full sm:w-[180px] rounded-xl bg-card border-border">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-400" />
              <SelectValue placeholder="Status" />
            </div>
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="all">All Recharges</SelectItem>
            <SelectItem value="SUCCESS">Successful</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          className="w-full sm:w-auto rounded-xl font-bold text-slate-700">
          <Download className="mr-2 h-4 w-4" /> Export CSV
        </Button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow>
              <TableHead className="font-bold text-muted-foreground uppercase tracking-widest text-xs">
                Invoice #
              </TableHead>
              <TableHead className="font-bold text-muted-foreground uppercase tracking-widest text-xs">
                Client (Lab)
              </TableHead>
              <TableHead className="font-bold text-muted-foreground uppercase tracking-widest text-xs">
                Date
              </TableHead>
              <TableHead className="font-bold text-muted-foreground uppercase tracking-widest text-xs">
                Net Amount (Credit)
              </TableHead>
              <TableHead className="font-bold text-muted-foreground uppercase tracking-widest text-xs">
                Status
              </TableHead>
              <TableHead className="text-right font-bold text-muted-foreground uppercase tracking-widest text-xs">
                Action
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-slate-100">
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-32 text-center text-muted-foreground font-medium">
                  Loading invoices...
                </TableCell>
              </TableRow>
            ) : data?.data?.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-32 text-center text-muted-foreground font-medium">
                  No invoices found.
                </TableCell>
              </TableRow>
            ) : (
              data?.data?.map((inv: any) => {
                const invoiceId = inv.id
                  ? `${inv.id.split("-")[0].toUpperCase()}-${inv.id.split("-")[4].toUpperCase()}`
                  : "N/A";
                const labName = inv.wallet?.lab?.name || "Unknown Lab";
                const labEmail = inv.wallet?.lab?.email || "N/A";

                return (
                  <TableRow
                    key={inv.id}
                    className="hover:bg-muted/50/50 transition-colors">
                    <TableCell className="font-mono font-bold text-foreground/80 text-xs">
                      {invoiceId}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-bold text-sm text-foreground">
                          {labName}
                        </span>
                        <span className="text-xs text-muted-foreground font-medium">
                          {labEmail}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm font-medium text-slate-700">
                      {format(new Date(inv.createdAt), "dd MMM yyyy")}
                    </TableCell>
                    <TableCell className="font-black text-foreground">
                      {formatCurrency(Number(inv.amount))}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="bg-emerald-50 text-primary border-emerald-200 uppercase tracking-widest font-black text-[10px]">
                        SUCCESS
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <InvoicePreviewDialog
                        invoice={inv}
                        invoiceId={invoiceId}
                      />
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}

// ==========================================
// COMPONENT 2: INVOICE PREVIEW DIALOG
// ==========================================
function InvoicePreviewDialog({
  invoice,
  invoiceId,
}: {
  invoice: any;
  invoiceId: string;
}) {
  const componentRef = useRef<HTMLDivElement>(null);

  const handleDownloadPdf = async () => {
    if (!componentRef.current) return;
    toast.loading("Generating PDF...", { id: "pdf-toast" });

    try {
      const canvas = await html2canvas(componentRef.current, { scale: 2 });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Invoice_${invoiceId}.pdf`);
      toast.success("PDF Downloaded", { id: "pdf-toast" });
    } catch (e) {
      toast.error("Failed to generate PDF", { id: "pdf-toast" });
    }
  };

  // ============================================================================
  // ✅ EXACT GST MATH (Forward Calculation)
  // The database `amount` is the usable wallet credit (Subtotal).
  // We calculate 18% GST ON TOP of it to show the Gross Total paid via Razorpay.
  // ============================================================================
  const subtotal = Number(invoice.amount);
  const taxRate = 0.18; // 18% Total GST
  const totalTax = subtotal * taxRate;
  const cgst = totalTax / 2; // 9%
  const sgst = totalTax / 2; // 9%
  const totalAmount = subtotal + totalTax; // What Razorpay charged them (e.g., ₹118)

  const lab = invoice.wallet?.lab || {};

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="hover:bg-emerald-50 hover:text-primary rounded-lg">
          <Eye className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-6 rounded-3xl bg-muted">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-black text-lg text-slate-800">Invoice Viewer</h3>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="font-bold rounded-xl h-10 border-border bg-card"
              onClick={handleDownloadPdf}>
              <Download className="mr-2 h-4 w-4" /> Save PDF
            </Button>
            <Button
              onClick={() => window.print()}
              className="font-bold rounded-xl h-10 bg-primary hover:bg-primary/90 text-primary-foreground">
              <Printer className="mr-2 h-4 w-4" /> Print
            </Button>
          </div>
        </div>

        {/* INVOICE PAPER VIEW */}
        <div
          ref={componentRef}
          className="bg-card text-foreground rounded-xl shadow-sm border border-border overflow-hidden w-full mx-auto print:m-0 print:border-none print:shadow-none"
          id="invoice-print">
          {/* Top Decorative Border */}
          <div className="h-3 w-full bg-emerald-500" />

          <div className="p-10 md:p-14 space-y-12">
            {/* Header */}
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-4xl font-black text-slate-300 uppercase tracking-tighter mb-2">
                  TAX INVOICE
                </h1>
                <p className="text-muted-foreground font-mono font-bold text-sm bg-muted/30 inline-block px-2 py-1 rounded">
                  #{invoiceId}
                </p>
              </div>
              <div className="text-right">
                <h2 className="font-black text-2xl text-foreground">
                  Globizhub India Pvt Ltd.
                </h2>
                <p className="text-sm font-medium text-muted-foreground mt-1">
                  1st Floor, No 59, Nayanpur Rd
                </p>
                <p className="text-sm font-medium text-muted-foreground">
                  Ganeshguri, Guwahati, Assam 781006
                </p>
                <p className="text-xs font-bold text-muted-foreground/70 mt-2 uppercase">
                  GSTIN: <span className="text-slate-800">18AAHCG6385Q1ZN</span>
                </p>
              </div>
            </div>

            <Separator className="bg-muted" />

            {/* Bill To */}
            <div className="grid grid-cols-2 gap-8">
              <div>
                <h3 className="text-xs font-bold text-muted-foreground/70 uppercase tracking-widest mb-3">
                  Bill To
                </h3>
                <p className="font-black text-lg text-slate-800">
                  {lab.name || "Client Lab"}
                </p>
                <p className="text-sm font-medium text-muted-foreground mt-1">
                  {lab.address || "Address not provided"}
                </p>
                <p className="text-sm font-medium text-muted-foreground">
                  {lab.city} {lab.pincode}
                </p>
                <p className="text-sm font-medium text-muted-foreground mt-1">
                  {lab.email}
                </p>
                <p className="text-xs font-bold text-muted-foreground/70 mt-2 uppercase">
                  GSTIN:{" "}
                  <span className="text-slate-800">
                    {lab.gstNumber || "UNREGISTERED"}
                  </span>
                </p>
              </div>
              <div className="text-right flex flex-col items-end justify-center">
                <div className="mb-3 w-48 flex justify-between">
                  <span className="text-xs font-bold text-muted-foreground/70 uppercase">
                    Date:
                  </span>
                  <span className="text-sm font-bold text-slate-800">
                    {format(new Date(invoice.createdAt), "dd MMM yyyy")}
                  </span>
                </div>
                <div className="w-48 flex justify-between items-center">
                  <span className="text-xs font-bold text-muted-foreground/70 uppercase">
                    Status:
                  </span>
                  <Badge className="bg-emerald-50 text-primary border-emerald-200 font-bold uppercase tracking-widest text-[10px] shadow-none">
                    SUCCESS
                  </Badge>
                </div>
              </div>
            </div>

            {/* Items Table */}
            <div className="rounded-xl border border-border overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead className="bg-muted/30 border-b border-border">
                  <tr>
                    <th className="py-4 px-5 text-xs font-bold text-muted-foreground uppercase tracking-widest w-2/3">
                      Description
                    </th>
                    <th className="py-4 px-5 text-right text-xs font-bold text-muted-foreground uppercase tracking-widest">
                      SAC Code
                    </th>
                    <th className="py-4 px-5 text-right text-xs font-bold text-muted-foreground uppercase tracking-widest">
                      Net Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr className="bg-card">
                    <td className="py-5 px-5">
                      <p className="font-bold text-slate-800">
                        {invoice.description || "Prepaid Wallet Recharge"}
                      </p>
                      <p className="text-xs font-medium text-muted-foreground mt-1">
                        Platform credits for clinical software usage.
                      </p>
                    </td>
                    <td className="py-5 px-5 text-right font-medium text-muted-foreground text-sm">
                      998314
                    </td>
                    <td className="py-5 px-5 text-right font-bold text-slate-800">
                      {formatCurrency(subtotal)}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Totals */}
              <div className="bg-muted/30 p-6 border-t border-border flex flex-col items-end space-y-2">
                <div className="flex justify-between w-64 text-sm font-semibold text-muted-foreground">
                  <span>Subtotal (Wallet Credit)</span>
                  <span className="text-foreground">
                    {formatCurrency(subtotal)}
                  </span>
                </div>
                <div className="flex justify-between w-64 text-sm font-semibold text-muted-foreground">
                  <span>CGST (9%)</span>
                  <span className="text-foreground">{formatCurrency(cgst)}</span>
                </div>
                <div className="flex justify-between w-64 text-sm font-semibold text-muted-foreground">
                  <span>SGST (9%)</span>
                  <span className="text-foreground">{formatCurrency(sgst)}</span>
                </div>
                <Separator className="my-2 w-64 bg-slate-200" />
                <div className="flex justify-between w-64 font-black text-xl text-primary">
                  <span className="uppercase tracking-tight text-slate-800">
                    Gross Total
                  </span>
                  <span>{formatCurrency(totalAmount)}</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center text-xs font-medium text-muted-foreground/70 mt-12 pt-8 border-t border-slate-100">
              <p>
                This is a computer generated tax invoice. No signature required.
              </p>
              <p className="mt-1">
                Powered by{" "}
                <span className="font-bold text-slate-700">Patholab.cloud</span>
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ==========================================
// COMPONENT 3: INVOICE BUILDER (Settings)
// ==========================================
function InvoiceBuilder() {
  const [config, setConfig] = useState({
    businessName: "Patholab.cloud",
    address:
      "1st Floor, No 59, Nayanpur Rd\nGMC Ward 44, Ganeshguri\nGuwahati, Assam 781006",
    email: "billing@globizhub.com",
    phone: "+91 98765 43210",
    gstin: "18AAHCG6385Q1ZN",
    footerText: "Computer generated tax invoice. No signature required.",
    terms:
      "Prepaid wallet recharges are non-refundable. Platform usage fees are deducted automatically per patient registration.",
  });

  const handleSave = () => {
    toast.success("Invoice settings saved successfully!");
  };

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      {/* Editor Form */}
      <Card className="border-border shadow-sm rounded-2xl">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" /> Global Biller
            Configuration
          </CardTitle>
          <CardDescription>
            Customize your corporate details displayed on all tenant tax
            invoices.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 p-6">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
              Business Name
            </Label>
            <Input
              value={config.businessName}
              onChange={(e) =>
                setConfig({ ...config, businessName: e.target.value })
              }
              className="bg-muted/30 border-border font-bold rounded-xl"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                GSTIN
              </Label>
              <Input
                value={config.gstin}
                onChange={(e) =>
                  setConfig({ ...config, gstin: e.target.value })
                }
                className="bg-muted/30 border-border font-mono rounded-xl uppercase"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                Support Phone
              </Label>
              <Input
                value={config.phone}
                onChange={(e) =>
                  setConfig({ ...config, phone: e.target.value })
                }
                className="bg-muted/30 border-border font-medium rounded-xl"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
              Headquarters Address
            </Label>
            <Textarea
              value={config.address}
              onChange={(e) =>
                setConfig({ ...config, address: e.target.value })
              }
              className="bg-muted/30 border-border font-medium rounded-xl resize-none h-24"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
              Terms & Conditions
            </Label>
            <Textarea
              value={config.terms}
              onChange={(e) => setConfig({ ...config, terms: e.target.value })}
              className="bg-muted/30 border-border font-medium rounded-xl resize-none h-20"
            />
          </div>
          <Button
            onClick={handleSave}
            className="w-full bg-primary hover:bg-primary/90 h-12 rounded-xl font-bold shadow-md mt-4">
            <Save className="mr-2 h-4 w-4" /> Save Configuration
          </Button>
        </CardContent>
      </Card>

      {/* Live Preview Concept */}
      <Card className="border-border shadow-sm rounded-2xl bg-muted/30 overflow-hidden hidden xl:block">
        <CardHeader className="border-b border-border bg-slate-100/50">
          <CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
            <Eye className="w-4 h-4" /> Live Document Preview
          </CardTitle>
        </CardHeader>
        <CardContent className="p-8 flex justify-center bg-slate-200/50">
          {/* Miniature Paper Mockup */}
          <div className="bg-card border border-border shadow-xl p-8 w-full max-w-sm rounded-lg text-[10px] space-y-6">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="font-black text-sm text-slate-300 tracking-tighter mb-1">
                  TAX INVOICE
                </h1>
              </div>
              <div className="text-right">
                <p className="font-black text-foreground text-xs">
                  {config.businessName}
                </p>
                <p className="text-muted-foreground whitespace-pre-wrap leading-tight mt-1">
                  {config.address}
                </p>
                <p className="text-muted-foreground mt-1 font-bold">
                  GSTIN: {config.gstin}
                </p>
              </div>
            </div>

            <div className="h-20 bg-muted/30 border border-border rounded flex flex-col items-center justify-center text-slate-400">
              <Wallet className="w-4 h-4 mb-1 text-slate-300" />
              Dynamic Ledger Data
            </div>

            <div className="border-t border-slate-100 pt-4">
              <p className="font-bold text-muted-foreground mb-1">Terms:</p>
              <p className="text-muted-foreground leading-snug">{config.terms}</p>
            </div>

            <div className="text-center text-muted-foreground/70 pt-4 border-t border-slate-100">
              {config.footerText}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
