'use client';

import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Plus, Search, Download, Eye, DollarSign, Loader2, 
  MapPin, Phone, Mail, Filter, TrendingUp, AlertCircle, 
  CheckCircle2, Clock, Wallet, FileText, CalendarRange
} from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import toast from 'react-hot-toast';

// Helper for currency format
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(amount);
};

export default function BillingPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  
  // PDF Generation State
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [pdfData, setPdfData] = useState<any>(null);
  const hiddenInvoiceRef = useRef<HTMLDivElement>(null);

  // Fetch invoices list
  const { data, isLoading } = useQuery({
    queryKey: ['invoices', searchQuery, statusFilter, dateRange],
    queryFn: async () => {
      const params = new URLSearchParams({
        ...(searchQuery && { search: searchQuery }),
        ...(statusFilter !== 'ALL' && { status: statusFilter }),
        ...(dateRange.from && { from: dateRange.from }),
        ...(dateRange.to && { to: dateRange.to }),
      });
      const response = await fetch(`/api/lab-owner/invoices?${params}`);
      if (!response.ok) throw new Error('Failed to fetch invoices');
      return response.json();
    },
  });

  // --- PDF GENERATION EFFECT ---
  useEffect(() => {
    if (pdfData && hiddenInvoiceRef.current) {
        const generate = async () => {
            try {
                const html2pdf = (await import('html2pdf.js')).default;
                const opt = {
                    margin: 0,
                    filename: `Invoice-${pdfData.invoiceNumber}.pdf`,
                    image: { type: 'jpeg', quality: 0.98 },
                    html2canvas: { scale: 2, useCORS: true },
                    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
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
          const res = await fetch(`/api/lab-owner/invoices/${id}`);
          if (!res.ok) throw new Error("Fetch failed");
          const fullInvoice = await res.json();
          setPdfData(fullInvoice);
      } catch (e) {
          toast.error("Could not fetch invoice details");
          setDownloadingId(null);
      }
  };

  // 🆕 FEATURE 2: CSV Export Engine
  const handleExport = () => {
    if (!data?.invoices || data.invoices.length === 0) {
      return toast.error("No invoices to export based on current filters.");
    }

    // Prepare clean data for the accountant/CSV
    const exportData = data.invoices.map((inv: any) => ({
      "Invoice Number": inv.invoiceNumber,
      "Date": format(new Date(inv.createdAt), 'yyyy-MM-dd'),
      "Patient Name": inv.patient?.name || 'Unknown',
      "Patient Phone": inv.patient?.phone || 'N/A',
      "Status": inv.status,
      "Subtotal (INR)": inv.subtotal || 0,
      "Discount (INR)": inv.discount || 0,
      "Grand Total (INR)": inv.grandTotal || 0,
    }));

    // Extract Headers
    const headers = Object.keys(exportData[0]);
    
    // Create CSV Rows
    const csvRows = exportData.map((row: any) => {
      return headers.map(header => {
        const val = row[header];
        return `"${String(val).replace(/"/g, '""')}"`; // Escape quotes
      }).join(',');
    });

    // Combine and Trigger Download
    const csvContent = [headers.join(','), ...csvRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Billing_Ledger_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();

    toast.success(`Exported ${data.invoices.length} invoices successfully!`);
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'PAID':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm">
            <CheckCircle2 className="w-3.5 h-3.5" /> Paid
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest bg-amber-50 text-amber-700 border border-amber-200 shadow-sm">
            <Clock className="w-3.5 h-3.5" /> Pending
          </span>
        );
      case 'OVERDUE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest bg-rose-50 text-rose-700 border border-rose-200 shadow-sm animate-pulse">
            <AlertCircle className="w-3.5 h-3.5" /> Overdue
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest bg-slate-100 text-slate-600 border border-slate-200 shadow-sm">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 relative font-sans selection:bg-emerald-500/30 pb-12">
      
      {/* Ambient Background */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.02] pointer-events-none mix-blend-overlay"></div>
      <div className="absolute top-0 left-0 w-full h-[400px] bg-gradient-to-b from-emerald-100/40 via-teal-50/20 to-transparent pointer-events-none"></div>

      <div className="max-w-[1600px] mx-auto p-4 md:p-8 relative z-10 space-y-8 animate-in fade-in duration-500 slide-in-from-bottom-4">
        
        {/* --- HEADER --- */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 bg-white/60 backdrop-blur-xl border border-white/60 shadow-sm rounded-3xl p-6 md:p-8">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
               <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-xl shadow-md shadow-emerald-500/20">
                  <Wallet className="w-6 h-6" />
               </div>
               <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
                 Billing & Invoices
               </h1>
            </div>
            <p className="text-sm font-medium text-slate-500 ml-12">
              Manage patient payments, track revenue, and monitor outstanding balances.
            </p>
          </div>
          <Link href="/lab-owner/registration" className="w-full sm:w-auto">
            <Button className="w-full sm:w-auto h-12 px-6 rounded-xl bg-slate-900 hover:bg-emerald-600 text-white font-bold shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
              <Plus className="mr-2 h-5 w-5 text-emerald-400" />
              Create Invoice
            </Button>
          </Link>
        </div>

        {/* --- STATS CARDS (Bento Box Layout) --- */}
        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
          
          <div className="group relative bg-white/80 backdrop-blur-md border border-slate-200/60 rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-emerald-200">
            <div className="absolute -right-6 -top-6 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-colors"></div>
            <div className="flex justify-between items-start mb-4 relative z-10">
               <div>
                  <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest">Total Revenue</p>
                  <p className="text-xs font-medium text-slate-500 mt-0.5">All time collected</p>
               </div>
               <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                  <DollarSign className="w-5 h-5" />
               </div>
            </div>
            <div className="relative z-10">
               <h3 className="text-3xl font-black text-slate-900 tracking-tight">
                  {formatCurrency(data?.stats?.totalRevenue || 0)}
               </h3>
            </div>
          </div>

          <div className="group relative bg-white/80 backdrop-blur-md border border-slate-200/60 rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-teal-200">
            <div className="absolute -right-6 -top-6 w-24 h-24 bg-teal-500/10 rounded-full blur-2xl group-hover:bg-teal-500/20 transition-colors"></div>
            <div className="flex justify-between items-start mb-4 relative z-10">
               <div>
                  <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest">This Month</p>
                  <p className="text-xs font-medium text-slate-500 mt-0.5">Current month revenue</p>
               </div>
               <div className="p-2.5 bg-teal-50 text-teal-600 rounded-xl">
                  <TrendingUp className="w-5 h-5" />
               </div>
            </div>
            <div className="relative z-10">
               <h3 className="text-3xl font-black text-teal-600 tracking-tight">
                  {formatCurrency(data?.stats?.monthlyRevenue || 0)}
               </h3>
            </div>
          </div>

          <div className="group relative bg-white/80 backdrop-blur-md border border-slate-200/60 rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-amber-200">
            <div className="absolute -right-6 -top-6 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl group-hover:bg-amber-500/20 transition-colors"></div>
            <div className="flex justify-between items-start mb-4 relative z-10">
               <div>
                  <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest">Pending</p>
                  <p className="text-xs font-medium text-slate-500 mt-0.5">{data?.stats?.pendingCount || 0} unpaid invoices</p>
               </div>
               <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
                  <Clock className="w-5 h-5" />
               </div>
            </div>
            <div className="relative z-10">
               <h3 className="text-3xl font-black text-amber-600 tracking-tight">
                  {formatCurrency(data?.stats?.pendingAmount || 0)}
               </h3>
            </div>
          </div>

          <div className="group relative bg-white/80 backdrop-blur-md border border-slate-200/60 rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-rose-200">
            <div className="absolute -right-6 -top-6 w-24 h-24 bg-rose-500/10 rounded-full blur-2xl group-hover:bg-rose-500/20 transition-colors"></div>
            <div className="flex justify-between items-start mb-4 relative z-10">
               <div>
                  <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest">Overdue</p>
                  <p className="text-xs font-medium text-slate-500 mt-0.5">{data?.stats?.overdueCount || 0} invoices &gt; 30 days</p>
               </div>
               <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl">
                  <AlertCircle className="w-5 h-5" />
               </div>
            </div>
            <div className="relative z-10">
               <h3 className="text-3xl font-black text-rose-600 tracking-tight">
                  {formatCurrency(data?.stats?.overdueAmount || 0)}
               </h3>
            </div>
          </div>

        </div>

        {/* --- FILTERS & TABLE --- */}
        <div className="bg-white/80 backdrop-blur-xl border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-3xl overflow-hidden flex flex-col">
           
           {/* Control Bar */}
           <div className="p-6 bg-slate-50/50 border-b border-slate-100 flex flex-col xl:flex-row gap-4 justify-between items-center">
              
              <div className="flex items-center gap-2 w-full xl:w-auto bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
                  <div className="relative group w-full sm:w-36">
                      <CalendarRange className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                      <Input 
                          type="date" 
                          value={dateRange.from} 
                          onChange={e => setDateRange({...dateRange, from: e.target.value})} 
                          className="h-10 pl-9 pr-2 border-0 bg-transparent text-xs font-bold text-slate-600 focus-visible:ring-0 w-full" 
                          title="Start Date"
                      />
                  </div>
                  <span className="text-slate-300 font-bold">-</span>
                  <div className="relative group w-full sm:w-36">
                      <Input 
                          type="date" 
                          value={dateRange.to} 
                          onChange={e => setDateRange({...dateRange, to: e.target.value})} 
                          className="h-10 px-3 border-0 bg-transparent text-xs font-bold text-slate-600 focus-visible:ring-0 w-full" 
                          title="End Date"
                      />
                  </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 w-full xl:w-auto">
                <div className="relative w-full sm:w-64 group">
                   <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-emerald-600 transition-colors" />
                   <Input
                     placeholder="Search invoice # or patient..."
                     value={searchQuery}
                     onChange={(e) => setSearchQuery(e.target.value)}
                     className="w-full h-12 pl-12 pr-4 bg-white border-slate-200 rounded-xl text-sm font-medium focus-visible:ring-emerald-500 shadow-sm"
                   />
                </div>
                <div className="relative w-full sm:w-40">
                   <Filter className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                   <select
                     value={statusFilter}
                     onChange={(e) => setStatusFilter(e.target.value)}
                     className="w-full h-12 pl-11 pr-10 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 appearance-none cursor-pointer"
                     style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: `right .75rem center`, backgroundRepeat: `no-repeat`, backgroundSize: `1.5em 1.5em` }}
                   >
                     <option value="ALL">All Statuses</option>
                     <option value="PENDING">Pending</option>
                     <option value="PAID">Paid</option>
                     <option value="OVERDUE">Overdue</option>
                   </select>
                </div>
                
                {/* 🆕 FEATURE 2: Export Button */}
                <Button 
                    onClick={handleExport}
                    variant="outline"
                    className="w-full sm:w-auto h-12 px-5 bg-white border-slate-200 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 hover:border-emerald-200 rounded-xl shadow-sm font-bold transition-colors"
                >
                    <Download className="w-4 h-4 sm:mr-2" />
                    <span className="hidden sm:inline">Export Ledger</span>
                </Button>
              </div>
           </div>

           {/* Table Content */}
           <div className="flex-1 bg-white/30">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-24 gap-4">
                   <Loader2 className="animate-spin h-10 w-10 text-emerald-500" />
                   <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Loading Invoices...</p>
                </div>
              ) : data?.invoices?.length === 0 ? (
                 <div className="flex flex-col items-center justify-center py-24 text-slate-400 gap-4">
                    <FileText className="w-12 h-12 opacity-20" />
                    <p className="font-bold text-slate-600">No invoices found matching your criteria.</p>
                 </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[800px]">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-100/80 text-slate-500 text-[10px] uppercase tracking-widest font-extrabold">
                        <th className="px-6 py-5">Invoice #</th>
                        <th className="px-6 py-5">Patient Details</th>
                        <th className="px-6 py-5">Amount</th>
                        <th className="px-6 py-5">Status</th>
                        <th className="px-6 py-5">Date</th>
                        <th className="px-6 py-5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100/80 text-sm">
                      {data?.invoices?.map((invoice: any) => (
                        <tr key={invoice.id} className="hover:bg-emerald-50/30 transition-colors group">
                          
                          <td className="px-6 py-4">
                            <span className="font-mono font-extrabold text-sm text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-100">
                              {invoice.invoiceNumber}
                            </span>
                          </td>
                          
                          <td className="px-6 py-4 font-bold text-slate-800">
                            {invoice.patient?.name || 'Unknown Patient'}
                          </td>
                          
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="font-black text-slate-900 text-base">{formatCurrency(invoice.grandTotal)}</span>
                              {invoice.discount > 0 && (
                                <span className="text-[10px] font-bold text-teal-600 uppercase tracking-wider">
                                  -{formatCurrency(invoice.discount)} Discount
                                </span>
                              )}
                            </div>
                          </td>
                          
                          <td className="px-6 py-4">
                            {getStatusBadge(invoice.status)}
                          </td>
                          
                          <td className="px-6 py-4 text-slate-500 font-medium">
                            {format(new Date(invoice.createdAt), 'dd MMM yyyy')}
                          </td>
                          
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                              <Link href={`/lab-owner/billing/${invoice.id}`}>
                                  <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl border-slate-200 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 hover:border-emerald-200">
                                     <Eye className="h-4 w-4" />
                                  </Button>
                              </Link>
                              <Button 
                                  variant="outline" 
                                  size="icon" 
                                  className="h-9 w-9 rounded-xl border-slate-200 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 hover:border-emerald-200"
                                  onClick={() => handleDownloadClick(invoice.id)}
                                  disabled={downloadingId === invoice.id}
                                  title="Download PDF"
                              >
                                  {downloadingId === invoice.id ? <Loader2 className="h-4 w-4 animate-spin text-emerald-500"/> : <FileText className="h-4 w-4" />}
                              </Button>
                            </div>
                          </td>

                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
           </div>
        </div>
      </div>

      {/* --- HIDDEN INVOICE TEMPLATE FOR PDF GENERATION --- */}
      <div className="absolute top-0 left-[-9999px]">
         {pdfData && (
            <div ref={hiddenInvoiceRef} className="bg-white p-12 text-slate-900 font-sans" style={{ width: '210mm', minHeight: '297mm' }}>
                {/* Header */}
                <div className="flex justify-between items-start mb-12">
                   <div className="w-1/2">
                      <h1 className="text-2xl font-bold uppercase tracking-tight mb-4 text-emerald-950">{pdfData.lab?.name || 'Globiz Patholab'}</h1>
                      <div className="text-xs text-slate-600 space-y-1.5 font-medium">
                         <p className="flex items-center gap-2"><MapPin className="h-3 w-3"/> {pdfData.lab?.address}, {pdfData.lab?.city}</p>
                         <p className="flex items-center gap-2"><Phone className="h-3 w-3"/> {pdfData.lab?.phone}</p>
                         <p className="flex items-center gap-2"><Mail className="h-3 w-3"/> {pdfData.lab?.email}</p>
                      </div>
                   </div>
                   <div className="text-right w-1/2">
                      <h2 className="text-4xl font-black text-slate-200 tracking-widest uppercase mb-2">INVOICE</h2>
                      <p className="text-sm font-extrabold text-emerald-700 mb-3 tracking-wide">#{pdfData.invoiceNumber}</p>
                      <Badge className="bg-slate-100 text-slate-700 border-slate-200 px-3 py-1 font-bold uppercase tracking-widest text-[10px]">{pdfData.status}</Badge>
                   </div>
                </div>

                {/* Patient Grid */}
                <div className="grid grid-cols-2 gap-12 mb-12 border-t border-b border-slate-100 py-8 bg-slate-50/30 px-6 rounded-xl">
                   <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Billed To</p>
                      <h3 className="text-lg font-extrabold text-slate-900">{pdfData.patient?.name}</h3>
                      <div className="text-xs text-slate-600 mt-3 space-y-1.5">
                         <p><span className="font-bold w-16 inline-block text-slate-400">PID:</span> {pdfData.patient?.patientId}</p>
                         <p><span className="font-bold w-16 inline-block text-slate-400">Phone:</span> {pdfData.patient?.phone}</p>
                      </div>
                   </div>
                   <div className="grid grid-cols-2 gap-y-5 text-xs">
                      <div><p className="text-slate-400 font-bold uppercase mb-1.5 text-[9px] tracking-widest">Date</p><p className="font-semibold text-slate-800">{format(new Date(pdfData.createdAt), 'dd MMM yyyy')}</p></div>
                      <div><p className="text-slate-400 font-bold uppercase mb-1.5 text-[9px] tracking-widest">Time</p><p className="font-semibold text-slate-800">{format(new Date(pdfData.createdAt), 'h:mm a')}</p></div>
                   </div>
                </div>

                {/* Items */}
                <table className="w-full text-sm mb-12">
                   <thead>
                      <tr className="border-b-2 border-slate-200">
                         <th className="py-3 text-left font-extrabold text-slate-500 uppercase text-[10px] tracking-widest">Description of Services</th>
                         <th className="py-3 text-right font-extrabold text-slate-500 uppercase text-[10px] tracking-widest">Price</th>
                         <th className="py-3 text-right font-extrabold text-slate-500 uppercase text-[10px] tracking-widest">Total Amount</th>
                      </tr>
                   </thead>
                   <tbody className="text-slate-700 font-medium">
                      {pdfData.items?.map((item: any, i: number) => (
                         <tr key={i} className="border-b border-slate-100">
                            <td className="py-4 text-slate-900 font-bold">{item.description}</td>
                            <td className="py-4 text-right text-slate-500">₹{item.unitPrice}</td>
                            <td className="py-4 text-right font-bold text-slate-900">₹{item.total}</td>
                         </tr>
                      ))}
                   </tbody>
                </table>

                {/* Totals */}
                <div className="flex justify-end">
                   <div className="w-72 space-y-3 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                      <div className="flex justify-between text-xs font-bold text-slate-500"><span>Subtotal</span><span className="text-slate-900">₹{pdfData.subtotal}</span></div>
                      <div className="flex justify-between text-xs font-bold text-rose-500"><span>Discount</span><span>- ₹{pdfData.discount}</span></div>
                      <div className="h-px w-full bg-slate-200 my-2"></div>
                      <div className="flex justify-between text-xl font-black text-emerald-700"><span>Total</span><span>₹{pdfData.grandTotal}</span></div>
                   </div>
                </div>
            </div>
         )}
      </div>

    </div>
  );
}