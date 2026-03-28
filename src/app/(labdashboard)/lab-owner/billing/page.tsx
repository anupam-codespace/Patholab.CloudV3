'use client';

import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Plus, Search, Download, Eye, DollarSign, Loader2, MapPin, Phone, Mail } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import toast from 'react-hot-toast';

// Helper for currency format
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0
  }).format(amount);
};

export default function BillingPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  
  // PDF Generation State
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [pdfData, setPdfData] = useState<any>(null);
  const hiddenInvoiceRef = useRef<HTMLDivElement>(null);

  // Fetch invoices list
  const { data, isLoading } = useQuery({
    queryKey: ['invoices', searchQuery, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        ...(searchQuery && { search: searchQuery }),
        ...(statusFilter !== 'ALL' && { status: statusFilter }),
      });
      const response = await fetch(`/api/lab-owner/invoices?${params}`);
      if (!response.ok) throw new Error('Failed to fetch invoices');
      return response.json();
    },
  });

  // --- PDF GENERATION EFFECT ---
  // When pdfData is populated, trigger the download
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
        // Small timeout to ensure DOM render
        setTimeout(generate, 500);
    }
  }, [pdfData]);

  const handleDownloadClick = async (id: string) => {
      setDownloadingId(id);
      try {
          // 1. Fetch Full Details (Items are needed for PDF)
          const res = await fetch(`/api/lab-owner/invoices/${id}`);
          if (!res.ok) throw new Error("Fetch failed");
          const fullInvoice = await res.json();
          setPdfData(fullInvoice);
      } catch (e) {
          toast.error("Could not fetch invoice details");
          setDownloadingId(null);
      }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      PENDING: 'bg-orange-100 text-orange-700 border-orange-200',
      PAID: 'bg-green-100 text-green-700 border-green-200',
      OVERDUE: 'bg-red-100 text-red-700 border-red-200',
      CANCELLED: 'bg-gray-100 text-gray-700 border-gray-200',
    };

    return (
      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold border ${styles[status] || styles.PENDING}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-6 p-6 bg-slate-50/50 min-h-screen">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Billing & Invoices</h1>
          <p className="text-slate-500">Manage payments and revenue tracking</p>
        </div>
        <Link href="/lab-owner/registration">
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Plus className="mr-2 h-4 w-4" />
            Create Invoice
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {formatCurrency(data?.stats?.totalRevenue || 0)}
            </div>
            <p className="text-xs text-slate-500">All time collected</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Pending</CardTitle>
            <div className="h-2 w-2 rounded-full bg-orange-500"/>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {formatCurrency(data?.stats?.pendingAmount || 0)}
            </div>
            <p className="text-xs text-slate-500">
              {data?.stats?.pendingCount || 0} invoices unpaid
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">This Month</CardTitle>
            <div className="h-2 w-2 rounded-full bg-green-500"/>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(data?.stats?.monthlyRevenue || 0)}
            </div>
            <p className="text-xs text-slate-500">Revenue this month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Overdue</CardTitle>
            <div className="h-2 w-2 rounded-full bg-red-500"/>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(data?.stats?.overdueAmount || 0)}
            </div>
            <p className="text-xs text-slate-500">
              {data?.stats?.overdueCount || 0} invoices {'>'} 30 days
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Table */}
      <div className="flex flex-col gap-6">
        <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search by invoice number or patient name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="ALL">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="PAID">Paid</option>
              <option value="OVERDUE">Overdue</option>
            </select>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent Invoices</CardTitle>
            <CardDescription>{data?.invoices?.length || 0} invoices found</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-12 text-blue-600"><Loader2 className="animate-spin h-8 w-8"/></div>
            ) : data?.invoices?.length === 0 ? (
                <div className="text-center py-12 text-slate-400">No invoices found matching your criteria.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b bg-slate-50/50">
                    <tr className="text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                      <th className="px-4 py-3">Invoice #</th>
                      <th className="px-4 py-3">Patient</th>
                      <th className="px-4 py-3">Amount</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data?.invoices?.map((invoice: any) => (
                      <tr key={invoice.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3 font-mono font-medium text-blue-600">
                          {invoice.invoiceNumber}
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-700">
                          {invoice.patient?.name || 'Unknown'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-900">{formatCurrency(invoice.grandTotal)}</span>
                            {invoice.discount > 0 && (
                              <span className="text-[10px] text-green-600">-{formatCurrency(invoice.discount)} OFF</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {getStatusBadge(invoice.status)}
                        </td>
                        <td className="px-4 py-3 text-slate-500">
                          {format(new Date(invoice.createdAt), 'dd MMM yyyy')}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-2">
                            <Link href={`/lab-owner/billing/${invoice.id}`}>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-blue-600">
                                <Eye className="h-4 w-4" />
                                </Button>
                            </Link>
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-slate-400 hover:text-blue-600"
                                onClick={() => handleDownloadClick(invoice.id)}
                                disabled={downloadingId === invoice.id}
                            >
                                {downloadingId === invoice.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <Download className="h-4 w-4" />}
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
      </div>

      {/* --- HIDDEN INVOICE TEMPLATE FOR PDF GENERATION --- */}
      <div className="absolute top-0 left-[-9999px]">
         {pdfData && (
            <div ref={hiddenInvoiceRef} className="bg-white p-12 text-slate-900" style={{ width: '210mm', minHeight: '297mm' }}>
                {/* Header */}
                <div className="flex justify-between items-start mb-12">
                   <div className="w-1/2">
                      <h1 className="text-2xl font-bold uppercase tracking-tight mb-4">{pdfData.lab?.name || 'Globiz Patholab'}</h1>
                      <div className="text-xs text-slate-500 space-y-1">
                         <p className="flex items-center gap-2"><MapPin className="h-3 w-3"/> {pdfData.lab?.address}, {pdfData.lab?.city}</p>
                         <p className="flex items-center gap-2"><Phone className="h-3 w-3"/> {pdfData.lab?.phone}</p>
                         <p className="flex items-center gap-2"><Mail className="h-3 w-3"/> {pdfData.lab?.email}</p>
                      </div>
                   </div>
                   <div className="text-right w-1/2">
                      <h2 className="text-4xl font-bold text-slate-200 tracking-widest uppercase mb-2">INVOICE</h2>
                      <p className="text-sm font-bold text-blue-600 mb-2">#{pdfData.invoiceNumber}</p>
                      <Badge className="bg-slate-100 text-slate-700 border-slate-200 px-3 py-1">{pdfData.status}</Badge>
                   </div>
                </div>

                {/* Patient Grid */}
                <div className="grid grid-cols-2 gap-12 mb-12 border-t border-b border-slate-100 py-8">
                   <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Billed To</p>
                      <h3 className="text-lg font-bold text-slate-900">{pdfData.patient?.name}</h3>
                      <div className="text-xs text-slate-600 mt-2 space-y-1">
                         <p><span className="font-bold w-16 inline-block text-slate-400">PID:</span> {pdfData.patient?.patientId}</p>
                         <p><span className="font-bold w-16 inline-block text-slate-400">Phone:</span> {pdfData.patient?.phone}</p>
                      </div>
                   </div>
                   <div className="grid grid-cols-2 gap-y-4 text-xs">
                      <div><p className="text-slate-400 font-bold uppercase mb-1">Date</p><p className="font-semibold">{format(new Date(pdfData.createdAt), 'dd MMM yyyy')}</p></div>
                      <div><p className="text-slate-400 font-bold uppercase mb-1">Time</p><p className="font-semibold">{format(new Date(pdfData.createdAt), 'h:mm a')}</p></div>
                   </div>
                </div>

                {/* Items */}
                <table className="w-full text-sm mb-12">
                   <thead>
                      <tr className="border-b border-slate-200">
                         <th className="py-2 text-left font-bold text-slate-500 uppercase text-[10px]">Description</th>
                         <th className="py-2 text-right font-bold text-slate-500 uppercase text-[10px]">Price</th>
                         <th className="py-2 text-right font-bold text-slate-500 uppercase text-[10px]">Total</th>
                      </tr>
                   </thead>
                   <tbody className="text-slate-700">
                      {pdfData.items?.map((item: any, i: number) => (
                         <tr key={i} className="border-b border-slate-100">
                            <td className="py-3">{item.description}</td>
                            <td className="py-3 text-right">₹{item.unitPrice}</td>
                            <td className="py-3 text-right font-bold">₹{item.total}</td>
                         </tr>
                      ))}
                   </tbody>
                </table>

                {/* Totals */}
                <div className="flex justify-end">
                   <div className="w-64 space-y-2">
                      <div className="flex justify-between text-xs font-medium text-slate-500"><span>Subtotal</span><span>₹{pdfData.subtotal}</span></div>
                      <div className="flex justify-between text-xs font-medium text-slate-500"><span>Discount</span><span>- ₹{pdfData.discount}</span></div>
                      <Separator/>
                      <div className="flex justify-between text-xl font-bold text-blue-600"><span>Total</span><span>₹{pdfData.grandTotal}</span></div>
                   </div>
                </div>
            </div>
         )}
      </div>

    </div>
  );
}