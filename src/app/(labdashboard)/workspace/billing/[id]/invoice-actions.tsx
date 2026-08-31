'use client';

import { Button } from '@/components/ui/button';
import { Printer, Download, Mail, Send, Share2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface InvoiceActionsProps {
  invoiceId?: string;
  patientPhone?: string;
  patientEmail?: string | null;
  patientName?: string;
  invoiceNumber?: string;
}

export default function InvoiceActions({
  invoiceId,
  patientPhone,
  patientEmail,
  patientName,
  invoiceNumber,
}: InvoiceActionsProps) {
  if (!invoiceId) {
    return null;
  }

  // 1. Direct Print — opens PDF in new tab and triggers browser print
  const handlePrint = async () => {
    const toastId = toast.loading('Preparing invoice for print...');
    try {
      const res = await fetch(`/api/workspace/invoices/${invoiceId}/pdf`);
      if (!res.ok) throw new Error('Failed to generate PDF');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const win = window.open(url, '_blank');
      if (win) {
        win.addEventListener('load', () => {
          setTimeout(() => {
            win.focus();
            win.print();
          }, 500);
        });
        toast.success('Print preview opened in new tab.', { id: toastId });
      } else {
        toast.success('PDF opened in new tab. Use Ctrl+P to print.', { id: toastId });
      }
      setTimeout(() => window.URL.revokeObjectURL(url), 60000);
    } catch (e) {
      toast.error('Failed to generate PDF for printing.', { id: toastId });
    }
  };

  // 2. Download PDF
  const handleDownload = async () => {
    const toastId = toast.loading('Generating PDF...');
    try {
      const res = await fetch(`/api/workspace/invoices/${invoiceId}/pdf`);
      if (!res.ok) throw new Error('Failed to generate PDF');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Invoice_${invoiceNumber || invoiceId}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Invoice downloaded!', { id: toastId });
    } catch (e) {
      toast.error('Failed to download invoice.', { id: toastId });
    }
  };

  // 3. Send via WhatsApp
  const handleWhatsApp = () => {
    if (!patientPhone) {
      toast.error('Patient has no phone number.');
      return;
    }
    let phone = patientPhone.replace(/\D/g, '');
    if (phone.length === 10) phone = `91${phone}`;

    const invoiceUrl = `${window.location.origin}/workspace/billing/${invoiceId}`;
    const message = `Hello ${patientName || 'Patient'},\n\nYour invoice ${invoiceNumber || ''} is ready. You can view and download it here:\n${invoiceUrl}\n\nThank you.`;
    const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
    toast.success('Opening WhatsApp...');
  };

  // 4. Send via Email (Gmail compose)
  const handleEmail = () => {
    if (!patientEmail) {
      toast.error('Patient has no email address.');
      return;
    }
    const invoiceUrl = `${window.location.origin}/workspace/billing/${invoiceId}`;
    const subject = `Invoice ${invoiceNumber || ''} - Lab Test Bill`;
    const body = `Hello ${patientName || 'Patient'},\n\nYour invoice ${invoiceNumber || ''} is ready. You can view and download it using the link below:\n\n${invoiceUrl}\n\nThank you.`;
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(patientEmail)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(gmailUrl, '_blank');
    toast.success('Opening email composer...');
  };

  // 5. Copy shareable link
  const handleShareLink = async () => {
    const invoiceUrl = `${window.location.origin}/workspace/billing/${invoiceId}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: `Invoice ${invoiceNumber || ''}`,
          text: `Invoice for ${patientName || 'patient'}`,
          url: invoiceUrl,
        });
      } else {
        await navigator.clipboard.writeText(invoiceUrl);
        toast.success('Invoice link copied to clipboard!');
      }
    } catch (e) {
      // user cancelled share — do nothing
    }
  };

  return (
    <div className="relative group">
      <div className="relative flex flex-wrap items-center gap-3 p-2 bg-card border border-slate-100 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-sm">
        {/* EMAIL */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleEmail}
          className="h-10 px-4 rounded-xl text-muted-foreground hover:bg-muted/30 hover:text-primary transition-all active:scale-95 flex items-center gap-2 group/btn"
          title="Send via Email"
        >
          <div className="p-1.5 rounded-lg bg-indigo-50 text-primary group-hover/btn:scale-110 transition-transform">
            <Send className="h-3.5 w-3.5" />
          </div>
          <span className="text-[11px] font-black uppercase tracking-widest">Email</span>
        </Button>

        <div className="w-px h-6 bg-muted hidden sm:block"></div>

        {/* WHATSAPP */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleWhatsApp}
          className="h-10 px-4 rounded-xl text-muted-foreground hover:bg-green-50 hover:text-green-700 transition-all active:scale-95 flex items-center gap-2 group/btn"
          title="Send via WhatsApp"
        >
          <div className="p-1.5 rounded-lg bg-green-50 text-green-600 group-hover/btn:scale-110 transition-transform">
            <Share2 className="h-3.5 w-3.5" />
          </div>
          <span className="text-[11px] font-black uppercase tracking-widest">WhatsApp</span>
        </Button>

        <div className="w-px h-6 bg-muted hidden sm:block"></div>

        {/* PRINT */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handlePrint}
          className="h-10 px-4 rounded-xl text-muted-foreground hover:bg-muted/30 hover:text-primary transition-all active:scale-95 flex items-center gap-2 group/btn"
          title="Print Invoice"
        >
          <div className="p-1.5 rounded-lg bg-emerald-50 text-primary group-hover/btn:scale-110 transition-transform">
            <Printer className="h-3.5 w-3.5" />
          </div>
          <span className="text-[11px] font-black uppercase tracking-widest">Print</span>
        </Button>

        {/* DOWNLOAD (PRIMARY) */}
        <Button
          size="sm"
          onClick={handleDownload}
          className="h-10 px-5 bg-slate-900 hover:bg-black text-primary-foreground rounded-xl shadow-lg transition-all active:scale-95 flex items-center gap-2"
          title="Download PDF"
        >
          <Download className="h-4 w-4" />
          <span className="text-[11px] font-black uppercase tracking-widest">Download PDF</span>
        </Button>

        {/* SHARE LINK */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleShareLink}
          className="h-10 px-4 rounded-xl text-muted-foreground hover:bg-muted/30 hover:text-primary transition-all active:scale-95 flex items-center gap-2"
          title="Copy Share Link"
        >
          <Mail className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
