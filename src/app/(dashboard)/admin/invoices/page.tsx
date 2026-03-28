'use client';

import { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  FileText, Download, Filter, Search, Settings, Printer, 
  CheckCircle2, XCircle, Clock, Eye, Save 
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
    <div className="space-y-6 p-8 min-h-screen bg-muted/5">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Invoice Management</h1>
          <p className="text-muted-foreground">Manage billing, taxation, and global invoice templates.</p>
        </div>
        <div className="flex gap-2">
          <Button variant={activeTab === 'list' ? 'default' : 'outline'} onClick={() => setActiveTab('list')}>
            <FileText className="mr-2 h-4 w-4" /> All Invoices
          </Button>
          <Button variant={activeTab === 'settings' ? 'default' : 'outline'} onClick={() => setActiveTab('settings')}>
            <Settings className="mr-2 h-4 w-4" /> Invoice Builder
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
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
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-4 items-center bg-card p-4 rounded-lg border">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search by Invoice # or Lab Name..." 
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[180px]">
            <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="PAID">Paid</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="OVERDUE">Overdue</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline"><Download className="mr-2 h-4 w-4" /> Export</Button>
      </div>

      {/* Table */}
      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice #</TableHead>
              <TableHead>Client (Lab)</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="h-24 text-center">Loading invoices...</TableCell></TableRow>
            ) : data?.data?.map((inv: any) => (
              <TableRow key={inv.id}>
                <TableCell className="font-mono font-medium">{inv.invoiceNumber}</TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium text-sm">{inv.lab.name}</span>
                    <span className="text-xs text-muted-foreground">{inv.lab.email}</span>
                  </div>
                </TableCell>
                <TableCell>{format(new Date(inv.createdAt), 'MMM dd, yyyy')}</TableCell>
                <TableCell className="font-bold">{formatCurrency(inv.total)}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={
                    inv.status === 'PAID' ? 'bg-green-100 text-green-700 border-green-200' :
                    inv.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
                    'bg-red-100 text-red-700 border-red-200'
                  }>
                    {inv.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <InvoicePreviewDialog invoice={inv} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
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
    toast.loading('Generating PDF...');
    
    const canvas = await html2canvas(componentRef.current, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`Invoice_${invoice.invoiceNumber}.pdf`);
    toast.dismiss();
    toast.success('PDF Downloaded');
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon"><Eye className="h-4 w-4" /></Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-end gap-2 mb-4">
          <Button variant="outline" onClick={handleDownloadPdf}><Download className="mr-2 h-4 w-4" /> Download PDF</Button>
          <Button onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" /> Print</Button>
        </div>
        
        {/* INVOICE PAPER VIEW */}
        <div ref={componentRef} className="bg-white text-black p-12 shadow-lg min-h-[1000px] w-full" id="invoice-print">
          {/* Header */}
          <div className="flex justify-between items-start mb-8">
            <div>
              <h1 className="text-4xl font-bold text-primary mb-2">INVOICE</h1>
              <p className="text-gray-500">#{invoice.invoiceNumber}</p>
            </div>
            <div className="text-right">
              <h2 className="font-bold text-xl">Globiz Patholab SaaS</h2>
              <p className="text-sm text-gray-600">123 Tech Park, Sector 5</p>
              <p className="text-sm text-gray-600">Mumbai, MH 400001</p>
              <p className="text-sm text-gray-600">GSTIN: 27AABCU9603R1ZN</p>
            </div>
          </div>

          <Separator className="my-6" />

          {/* Bill To */}
          <div className="grid grid-cols-2 gap-8 mb-8">
            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Bill To</h3>
              <p className="font-bold">{invoice.lab.name}</p>
              <p className="text-sm text-gray-600">{invoice.lab.address || 'Address not provided'}</p>
              <p className="text-sm text-gray-600">{invoice.lab.email}</p>
              {invoice.lab.gstNumber && <p className="text-sm text-gray-600">GSTIN: {invoice.lab.gstNumber}</p>}
            </div>
            <div className="text-right">
              <div className="mb-2">
                <span className="text-sm font-semibold text-gray-500 uppercase mr-4">Date:</span>
                <span className="font-medium">{format(new Date(invoice.createdAt), 'dd MMM yyyy')}</span>
              </div>
              <div className="mb-2">
                <span className="text-sm font-semibold text-gray-500 uppercase mr-4">Status:</span>
                <span className={`font-bold px-2 py-1 rounded text-xs ${invoice.status === 'PAID' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {invoice.status}
                </span>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <table className="w-full mb-8">
            <thead className="bg-gray-50 border-y border-gray-200">
              <tr>
                <th className="py-3 text-left pl-4 text-sm font-semibold text-gray-600">Description</th>
                <th className="py-3 text-right text-sm font-semibold text-gray-600">SAC Code</th>
                <th className="py-3 text-right text-sm font-semibold text-gray-600">Qty</th>
                <th className="py-3 text-right pr-4 text-sm font-semibold text-gray-600">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {invoice.items.map((item: any) => (
                <tr key={item.id}>
                  <td className="py-3 pl-4 text-sm">{item.description}</td>
                  <td className="py-3 text-right text-sm text-gray-500">{item.hsnSacCode || '998311'}</td>
                  <td className="py-3 text-right text-sm">{item.quantity}</td>
                  <td className="py-3 pr-4 text-right text-sm font-medium">{formatCurrency(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="flex justify-end mb-8">
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span>{formatCurrency(invoice.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">CGST (9%)</span>
                <span>{formatCurrency(invoice.cgstAmount || 0)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">SGST (9%)</span>
                <span>{formatCurrency(invoice.sgstAmount || 0)}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>{formatCurrency(invoice.total)}</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center text-xs text-gray-400 mt-12 pt-8 border-t">
            <p>This is a computer generated invoice.</p>
            <p>Globiz Patholab SaaS Solutions • Contact: support@Globiz Patholab.com</p>
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
    email: 'billing@Globiz Patholab.com',
    phone: '+91 98765 43210',
    gstin: '27AABCU9603R1ZN',
    footerText: 'Thank you for your business.',
    terms: 'Payment due within 30 days.'
  });

  const handleSave = () => {
    toast.success('Invoice settings saved successfully!');
    // Call API to save (mocked)
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Editor Form */}
      <Card>
        <CardHeader>
          <CardTitle>Global Template Configuration</CardTitle>
          <CardDescription>Customize how your invoices look for all labs.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Business Name</Label>
            <Input value={config.businessName} onChange={e => setConfig({...config, businessName: e.target.value})} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>GSTIN</Label>
              <Input value={config.gstin} onChange={e => setConfig({...config, gstin: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={config.phone} onChange={e => setConfig({...config, phone: e.target.value})} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Address</Label>
            <Textarea value={config.address} onChange={e => setConfig({...config, address: e.target.value})} />
          </div>
          <div className="space-y-2">
            <Label>Footer Note</Label>
            <Input value={config.footerText} onChange={e => setConfig({...config, footerText: e.target.value})} />
          </div>
          <div className="space-y-2">
            <Label>Terms & Conditions</Label>
            <Textarea value={config.terms} onChange={e => setConfig({...config, terms: e.target.value})} />
          </div>
          <Button onClick={handleSave} className="w-full"><Save className="mr-2 h-4 w-4" /> Save Configuration</Button>
        </CardContent>
      </Card>

      {/* Live Preview */}
      <Card className="bg-gray-50/50">
        <CardHeader>
          <CardTitle>Live Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-white border p-8 shadow-sm text-xs md:text-sm">
            <div className="flex justify-between mb-6">
              <div>
                <h1 className="font-bold text-xl text-primary">INVOICE</h1>
                <p className="text-gray-500">#INV-PREVIEW</p>
              </div>
              <div className="text-right">
                <p className="font-bold">{config.businessName}</p>
                <p className="text-gray-600 whitespace-pre-wrap">{config.address}</p>
                <p className="text-gray-600">GSTIN: {config.gstin}</p>
              </div>
            </div>
            
            <div className="h-32 bg-gray-100 flex items-center justify-center text-gray-400 mb-6 border border-dashed border-gray-300">
              [ Sample Items Table ]
            </div>

            <div className="mt-8 border-t pt-4">
              <p className="font-semibold mb-1">Terms & Conditions:</p>
              <p className="text-gray-600">{config.terms}</p>
            </div>
            
            <div className="mt-8 text-center text-gray-500">
              {config.footerText}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}