'use client';

import { Button } from '@/components/ui/button';
import { Printer, Download, Mail } from 'lucide-react';

export default function InvoiceActions() {
  return (
    <div className="flex gap-2">
      <Button variant="secondary" size="sm" onClick={() => alert("Email feature coming soon")}>
        <Mail className="h-4 w-4 mr-2"/> Email
      </Button>
      <Button variant="outline" size="sm" onClick={() => window.print()}>
        <Printer className="h-4 w-4 mr-2"/> Print
      </Button>
      <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => alert("PDF Download coming soon")}>
        <Download className="h-4 w-4 mr-2"/> Download PDF
      </Button>
    </div>
  );
}