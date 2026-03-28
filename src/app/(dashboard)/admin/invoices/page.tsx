'use client';

import { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  FileText, Download, Filter, Search, Settings, Printer, 
  CheckCircle2, XCircle, Clock, Eye, Save,
  Building2, Phone, Mail, FileSignature, Receipt
} from 'lucide-react';
import { format } from 'date-fns';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import toast from 'react-hot-toast';

// UI
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';

// --- UTILS ---
const formatCurrency = (val: number) => 
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val);

export default function AdminInvoicesPage() {
  const [activeTab, setActiveTab] = useState('list');
  
  return (
    <div className="min-h-screen bg-slate-50/50 pb-12">
      {/* Decorative Background Pattern */}
      <div className="absolute inset-0 z-0 h-64 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:16px_16px] opacity-50 pointer-events-none" />
      
      <div className="relative z-10 max-w-7xl mx-auto space-y-8 p-4 md:p-8">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-6">
          <div className="space-y-1">
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3">
              <Receipt className="h-8 w-8 text-violet-600" />
              Invoice Management
            </h1>
            <p className="text-base text-slate-500 max-w-2xl">
              Manage billing operations, monitor outstanding payments, and configure your global laboratory invoice templates.
            </p>
          </div>
          
          {/* Custom Segmented Control for Tabs */}
          <div className="flex p-1 bg-slate-200/50 backdrop-blur-sm rounded-xl border border-slate-200/60 shadow-inner">
            <button 
              onClick={() => setActiveTab('list')}
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-semibold rounded-lg transition-all duration-300 ${activeTab === 'list' ? 'bg-white text-violet-700 shadow-sm ring-1 ring-black/5' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'}`}
            >
              <FileText className="h-4 w-4" /> 
              Directory
            </button>
            <button 
              onClick={() => setActiveTab('settings')}
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-semibold rounded-lg transition-all duration-300 ${activeTab === 'settings' ? 'bg-white text-violet-700 shadow-sm ring-1 ring-black/5' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'}`}
            >
              <Settings className="h-4 w-4" /> 
              Builder
            </button>
          </div>
        </div>

        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          {activeTab === 'list' ? <InvoicesList /> : <InvoiceBuilder />}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// COMPONENT 1: INVOICES LIST (DataTable)
// ==========================================
function InvoicesList() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-invoices', page, search, status],
    queryFn: async () => {
      const params = new URLSearchParams({ page: page.toString(), limit: '10', search, status });
      const res = await fetch(`/api/admin/invoices?${params}`);
      return res.json();
    }
  });

  return (
    <div className="space-y-6">
      {/* Floating Filter Bar */}
      <div className="flex flex-col md:flex-row gap-4 p-4 bg-white/80 backdrop-blur-xl rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
          <Input 
            placeholder="Search by Invoice # or Lab Name..." 
            className="pl-10 h-11 bg-slate-50/50 border-slate-200 focus-visible:ring-violet-500 rounded-xl"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-3">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-full md:w-[180px] h-11 bg-slate-50/50 border-slate-200 rounded-xl">
              <Filter className="mr-2 h-4 w-4 text-slate-500" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-slate-200">
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="PAID">Paid</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="OVERDUE">Overdue</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" className="h-11 px-6 rounded-xl border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold shadow-sm transition-all">
            <Download className="mr-2 h-4 w-4" /> Export
          </Button>
        </div>
      </div>

      {/* Modern Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/80 border-b border-slate-200">
              <TableRow className="hover:bg-transparent">
                <TableHead className="py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Invoice #</TableHead>
                <TableHead className="py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Client</TableHead>
                <TableHead className="py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Date</TableHead>
                <TableHead className="py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Amount</TableHead>
                <TableHead className="py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Status</TableHead>
                <TableHead className="py-4 text-xs font-bold uppercase tracking-wider text-slate-500 text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-slate-100">
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-48 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="h-6 w-6 rounded-full border-2 border-violet-600 border-t-transparent animate-spin" />
                      <span className="text-sm font-medium">Loading ledger...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : data?.data?.map((inv: any) => (
                <TableRow key={inv.id} className="hover:bg-violet-50/30 transition-colors group">
                  <TableCell className="font-mono font-semibold text-slate-700 py-4">
                    {inv.invoiceNumber}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-900 group-hover:text-violet-700 transition-colors">{inv.lab.name}</span>
                      <span className="text-xs text-slate-500">{inv.lab.email}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-slate-600 font-medium text-sm">
                    {format(new Date(inv.createdAt), 'MMM dd, yyyy')}
                  </TableCell>
                  <TableCell className="font-extrabold text-slate-900 tracking-tight">
                    {formatCurrency(inv.total)}
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant="outline" 
                      className={`px-3 py-1 text-xs font-bold uppercase tracking-wider border ${
                        inv.status === 'PAID' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        inv.status === 'PENDING' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        'bg-rose-50 text-rose-700 border-rose-200'
                      }`}
                    >
                      {inv.status === 'PAID' && <CheckCircle2 className="mr-1.5 h-3 w-3 inline" />}
                      {inv.status === 'PENDING' && <Clock className="mr-1.5 h-3 w-3 inline" />}
                      {inv.status === 'OVERDUE' && <XCircle className="mr-1.5 h-3 w-3 inline" />}
                      {inv.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right pr-4">
                    <InvoicePreviewDialog invoice={inv} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// COMPONENT 2: INVOICE PREVIEW DIALOG
// ==========================================
function InvoicePreviewDialog({ invoice }: { invoice: any }) {
  const componentRef = useRef<HTMLDivElement>(null);

  const handleDownloadPdf = async () => {
    if (!componentRef.current) return;
    toast.loading('Generating High-Res PDF...', { id: 'pdf-toast' });
    
    try {
      const canvas = await html2canvas(componentRef.current, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Invoice_${invoice.invoiceNumber}.pdf`);
      toast.success('PDF Downloaded', { id: 'pdf-toast' });
    } catch (error) {
      toast.error('Failed to generate PDF', { id: 'pdf-toast' });
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-9 w-9 p-0 rounded-full hover:bg-violet-100 hover:text-violet-700 transition-colors"
        >
          <Eye className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden p-0 bg-slate-100/90 backdrop-blur-3xl border-slate-200 flex flex-col rounded-2xl">
        
        {/* Modal Toolbar */}
        <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200 shadow-sm z-10">
          <div>
            <h3 className="font-bold text-slate-900 tracking-tight">Invoice Document Viewer</h3>
            <p className="text-xs text-slate-500">Read-only preview</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleDownloadPdf} className="h-10 rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50">
              <Download className="mr-2 h-4 w-4" /> Export PDF
            </Button>
            <Button onClick={() => window.print()} className="h-10 rounded-xl bg-violet-600 hover:bg-violet-700 text-white shadow-md shadow-violet-500/20">
              <Printer className="mr-2 h-4 w-4" /> Print Document
            </Button>
          </div>
        </div>
        
        {/* Scrollable Document Area */}
        <div className="overflow-y-auto p-6 md:p-12 bg-slate-100/50">
          
          {/* THE PAPER (Strictly isolated for html2canvas) */}
          <div 
            ref={componentRef} 
            className="bg-white text-slate-900 p-12 shadow-2xl mx-auto w-full max-w-[800px] min-h-[1056px] relative" 
            id="invoice-print"
          >
            {/* Design Accent */}
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-violet-600 to-indigo-600" />

            {/* Header */}
            <div className="flex justify-between items-start mb-12 mt-4">
              <div>
                <h1 className="text-5xl font-black tracking-tighter text-slate-900 mb-2 uppercase">Invoice</h1>
                <p className="text-lg font-mono text-slate-500 tracking-wider">#{invoice.invoiceNumber}</p>
              </div>
              <div className="text-right space-y-1">
                <h2 className="font-extrabold text-2xl tracking-tight text-violet-900">Globiz Patholab SaaS</h2>
                <p className="text-sm text-slate-600">123 Tech Park, Sector 5</p>
                <p className="text-sm text-slate-600">Mumbai, MH 400001</p>
                <p className="text-sm font-semibold text-slate-800 mt-2">GSTIN: 27AABCU9603R1ZN</p>
              </div>
            </div>

            {/* Meta Data & Bill To */}
            <div className="grid grid-cols-2 gap-12 mb-12">
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Billed To</h3>
                <div>
                  <p className="font-bold text-lg text-slate-900">{invoice.lab.name}</p>
                  <p className="text-sm text-slate-600 mt-1 leading-relaxed max-w-[250px]">{invoice.lab.address || 'Address not provided'}</p>
                  <p className="text-sm text-slate-600 mt-1">{invoice.lab.email}</p>
                  {invoice.lab.gstNumber && <p className="text-sm font-semibold text-slate-800 mt-2">GSTIN: {invoice.lab.gstNumber}</p>}
                </div>
              </div>
              
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2 text-right">Invoice Details</h3>
                <div className="space-y-3 text-right">
                  <div className="flex justify-end gap-6 items-center">
                    <span className="text-sm font-medium text-slate-500">Date Issued</span>
                    <span className="font-semibold text-slate-900">{format(new Date(invoice.createdAt), 'dd MMM yyyy')}</span>
                  </div>
                  <div className="flex justify-end gap-6 items-center">
                    <span className="text-sm font-medium text-slate-500">Payment Status</span>
                    <span className={`font-bold px-3 py-1 rounded-md text-xs uppercase tracking-wider ${invoice.status === 'PAID' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                      {invoice.status}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Items Table */}
            <div className="mb-12 rounded-xl overflow-hidden border border-slate-200">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="py-4 text-left pl-6 text-xs font-bold text-slate-500 uppercase tracking-widest">Description</th>
                    <th className="py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-widest">SAC Code</th>
                    <th className="py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-widest">Qty</th>
                    <th className="py-4 text-right pr-6 text-xs font-bold text-slate-500 uppercase tracking-widest">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {invoice.items.map((item: any) => (
                    <tr key={item.id}>
                      <td className="py-4 pl-6 text-sm font-medium text-slate-900">{item.description}</td>
                      <td className="py-4 text-right text-sm text-slate-500">{item.hsnSacCode || '998311'}</td>
                      <td className="py-4 text-right text-sm text-slate-600">{item.quantity}</td>
                      <td className="py-4 pr-6 text-right text-sm font-bold text-slate-900">{formatCurrency(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals Section */}
            <div className="flex justify-end mb-16">
              <div className="w-[320px] bg-slate-50 p-6 rounded-xl border border-slate-200 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 font-medium">Subtotal</span>
                  <span className="font-semibold text-slate-900">{formatCurrency(invoice.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 font-medium">CGST (9%)</span>
                  <span className="font-semibold text-slate-900">{formatCurrency(invoice.cgstAmount || 0)}</span>
                </div>
                <div className="flex justify-between text-sm pb-3 border-b border-slate-200">
                  <span className="text-slate-500 font-medium">SGST (9%)</span>
                  <span className="font-semibold text-slate-900">{formatCurrency(invoice.sgstAmount || 0)}</span>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="text-base font-bold text-slate-900 uppercase tracking-widest">Total</span>
                  <span className="text-2xl font-black text-violet-700 tracking-tight">{formatCurrency(invoice.total)}</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="absolute bottom-12 left-12 right-12">
              <div className="border-t border-slate-200 pt-8 flex justify-between items-end">
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Globiz Patholab SaaS Solutions</p>
                  <p className="text-xs text-slate-500 font-medium">support@globizpatholab.com</p>
                </div>
                <p className="text-xs text-slate-400 italic font-medium">This is a computer-generated document.</p>
              </div>
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
    businessName: 'Globiz Patholab SaaS',
    address: '123 Tech Park, Mumbai',
    email: 'billing@globizpatholab.com',
    phone: '+91 98765 43210',
    gstin: '27AABCU9603R1ZN',
    footerText: 'Thank you for your business.',
    terms: 'Payment due within 30 days. Late payments subject to 1.5% interest/month.'
  });

  const handleSave = () => {
    toast.success('Global template configured successfully!', {
      icon: '✨',
      style: { borderRadius: '12px', background: '#333', color: '#fff' }
    });
    // API mock
  };

  return (
    <div className="grid gap-8 lg:grid-cols-12">
      
      {/* Configuration Form (Left) */}
      <div className="lg:col-span-5 space-y-6">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50">
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">Template Settings</h2>
            <p className="text-sm text-slate-500 mt-1">Configure the global identity for your platform invoices.</p>
          </div>
          
          <div className="p-6 space-y-8">
            {/* Section 1: Identity */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Building2 className="h-4 w-4" /> Business Identity
              </h3>
              <div className="space-y-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
                <div className="space-y-2">
                  <Label className="text-slate-700 font-semibold text-xs uppercase tracking-wide">Business Name</Label>
                  <Input 
                    className="h-11 rounded-lg border-slate-300 focus-visible:ring-violet-500 font-medium" 
                    value={config.businessName} 
                    onChange={e => setConfig({...config, businessName: e.target.value})} 
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-slate-700 font-semibold text-xs uppercase tracking-wide">GSTIN Number</Label>
                    <Input 
                      className="h-11 rounded-lg border-slate-300 focus-visible:ring-violet-500 font-mono text-sm" 
                      value={config.gstin} 
                      onChange={e => setConfig({...config, gstin: e.target.value})} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-700 font-semibold text-xs uppercase tracking-wide flex items-center gap-1">
                       Phone
                    </Label>
                    <Input 
                      className="h-11 rounded-lg border-slate-300 focus-visible:ring-violet-500" 
                      value={config.phone} 
                      onChange={e => setConfig({...config, phone: e.target.value})} 
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-700 font-semibold text-xs uppercase tracking-wide">Registered Address</Label>
                  <Textarea 
                    className="resize-none rounded-lg border-slate-300 focus-visible:ring-violet-500 min-h-[80px]" 
                    value={config.address} 
                    onChange={e => setConfig({...config, address: e.target.value})} 
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Footers & Terms */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <FileSignature className="h-4 w-4" /> Terms & Footer
              </h3>
              <div className="space-y-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
                <div className="space-y-2">
                  <Label className="text-slate-700 font-semibold text-xs uppercase tracking-wide">Terms & Conditions</Label>
                  <Textarea 
                    className="resize-none rounded-lg border-slate-300 focus-visible:ring-violet-500 min-h-[80px]" 
                    value={config.terms} 
                    onChange={e => setConfig({...config, terms: e.target.value})} 
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-700 font-semibold text-xs uppercase tracking-wide">Footer Note</Label>
                  <Input 
                    className="h-11 rounded-lg border-slate-300 focus-visible:ring-violet-500 text-sm" 
                    value={config.footerText} 
                    onChange={e => setConfig({...config, footerText: e.target.value})} 
                  />
                </div>
              </div>
            </div>

            <Button 
              onClick={handleSave} 
              className="w-full h-12 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold tracking-wide shadow-lg shadow-slate-900/20 transition-all hover:-translate-y-0.5"
            >
              <Save className="mr-2 h-5 w-5" /> Deploy Global Configuration
            </Button>
          </div>
        </div>
      </div>

      {/* Live Preview Environment (Right) */}
      <div className="lg:col-span-7">
        <div className="bg-slate-200/50 rounded-2xl border border-slate-200 p-4 md:p-8 h-full min-h-[600px] flex items-center justify-center relative overflow-hidden">
          
          {/* subtle background dot pattern */}
          <div className="absolute inset-0 z-0 bg-[radial-gradient(#94a3b8_1px,transparent_1px)] [background-size:16px_16px] opacity-30" />
          
          <div className="relative z-10 w-full max-w-xl bg-white p-8 md:p-10 shadow-2xl rounded-sm border border-slate-100 rotate-1 hover:rotate-0 transition-transform duration-500">
            
            <div className="absolute top-0 left-0 w-full h-1.5 bg-violet-600" />
            
            <div className="flex justify-between items-start mb-10 mt-2">
              <div>
                <h1 className="font-black text-2xl text-slate-900 uppercase tracking-tighter">INVOICE</h1>
                <p className="text-xs font-mono text-slate-400 mt-1">#INV-PREVIEW</p>
              </div>
              <div className="text-right">
                <p className="font-extrabold text-violet-800 text-lg tracking-tight">{config.businessName || 'Your Business Name'}</p>
                <p className="text-xs text-slate-500 whitespace-pre-wrap mt-1 leading-relaxed">{config.address || 'Your Address'}</p>
                <p className="text-xs font-semibold text-slate-700 mt-2">GSTIN: {config.gstin || '---'}</p>
              </div>
            </div>
            
            <div className="h-32 bg-slate-50 rounded border border-dashed border-slate-300 flex items-center justify-center text-slate-400 text-sm font-medium mb-10">
              [ Dynamic Line Items Injected Here ]
            </div>

            <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-6">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Terms & Conditions</p>
                <p className="text-xs text-slate-600 leading-relaxed pr-4">{config.terms || 'No terms specified.'}</p>
              </div>
              <div className="bg-slate-50 p-3 rounded border border-slate-100 h-24 flex items-center justify-center">
                <span className="text-xs text-slate-400 font-medium">Totals Computation Area</span>
              </div>
            </div>
            
            <div className="mt-12 text-center">
              <p className="text-xs font-medium text-slate-500 italic">{config.footerText}</p>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}