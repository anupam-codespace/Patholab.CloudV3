"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, Printer, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";

export default function InvoiceActions({ txId }: { txId: string }) { 
const router = useRouter();

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    toast.success("Generating PDF...");
    window.open(`/api/workspace/wallet/invoice/${txId}`, "_blank");
  };

  return (
    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 print:hidden">
      <Button
        variant="ghost"
        onClick={() => router.push("/workspace/wallet")}
        className="font-bold text-muted-foreground hover:text-foreground hover:bg-slate-200 rounded-xl h-12 px-6">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Wallet
      </Button>

      <div className="flex items-center gap-3 w-full sm:w-auto">
        <Button
          variant="outline"
          onClick={handlePrint}
          className="font-bold text-foreground/80 bg-card border-border hover:bg-muted/30 rounded-xl h-12 flex-1 sm:flex-none">
          <Printer className="w-4 h-4 mr-2" /> Print Receipt
        </Button>

        <Button
          onClick={handleDownloadPDF}
          className="font-bold text-primary-foreground bg-primary hover:bg-primary/90 shadow-md rounded-xl h-12 flex-1 sm:flex-none">
          <Download className="w-4 h-4 mr-2" /> Download PDF
        </Button>
      </div>
    </div>
  );
}
