"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, Printer, ScanLine, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import Barcode from "react-barcode";

function BarcodePrintContent() {
  const searchParams = useSearchParams();
  const invoiceId = searchParams.get("invoiceId");
  const [samples, setSamples] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!invoiceId) {
      setLoading(false);
      return;
    }

    fetch(`/api/workspace/invoices/${invoiceId}/barcodes`)
      .then((res) => res.json())
      .then((data) => {
        setSamples(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching barcodes:", err);
        setLoading(false);
      });
  }, [invoiceId]);

  if (loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin h-10 w-10 text-indigo-600 mb-4" />
        <p className="text-sm font-medium text-slate-500 animate-pulse">
          Generating Labels...
        </p>
      </div>
    );
  }

  if (!invoiceId || samples.length === 0) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-50">
        <AlertCircle className="h-12 w-12 text-slate-400 mb-4" />
        <h2 className="text-xl font-bold text-slate-800">No Samples Found</h2>
        <p className="text-slate-500 mb-6">
          No barcode labels are available for this request.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center p-4 sm:p-8 bg-slate-100 min-h-screen font-sans print:bg-white print:p-0 print:min-h-0 print:block">
      {/* --- STRICT PRINT CSS (Preserved 100%) --- */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm;
          }

          /* Reset Body/HTML to prevent overflow pages */
          html,
          body {
            margin: 0 !important;
            padding: 0 !important;
            height: auto !important;
            overflow: visible !important;
            background: white !important;
          }

          /* Hide everything by default */
          body * {
            visibility: hidden;
          }

          /* Show ONLY the print container and its children */
          #printable-area,
          #printable-area * {
            visibility: visible;
          }

          /* Position the container at the very top */
          #printable-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 0;

            /* Grid Layout */
            display: flex;
            flex-wrap: wrap;
            align-content: flex-start;
            gap: 5mm;
          }

          /* Prevent cutting stickers in half */
          .barcode-label {
            break-inside: avoid;
            page-break-inside: avoid;
            border: none !important; /* Remove preview border for actual print */
          }
        }
      `}</style>

      {/* --- CONTROLS (Hidden when printing) --- */}
      <div className="mb-8 print:hidden flex flex-col items-center gap-6 w-full max-w-4xl z-10 relative">
        <div className="bg-white/70 backdrop-blur-md p-6 rounded-2xl border border-slate-200/60 shadow-sm text-center flex flex-col items-center w-full">
          <div className="h-12 w-12 bg-indigo-50 rounded-xl flex items-center justify-center mb-4">
            <ScanLine className="h-6 w-6 text-indigo-600" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-1">
            Print Sample Labels
          </h1>
          <p className="text-sm font-medium text-slate-500 mb-6 max-w-md">
            Load thermal label stock or A4 sticker sheets. Verify printer
            settings before proceeding.
          </p>
          <Button
            onClick={() => window.print()}
            className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 w-48 h-11 rounded-xl font-bold shadow-md shadow-indigo-500/25 transition-all duration-300 hover:-translate-y-0.5">
            <Printer className="mr-2 h-4 w-4" /> Print {samples.length} Labels
          </Button>
        </div>
      </div>

      {/* --- PRINTABLE AREA (A4 Simulation for UI Preview) --- */}
      <div
        id="printable-area"
        className="bg-white shadow-2xl print:shadow-none print:bg-transparent w-[210mm] min-h-[297mm] p-[10mm] print:p-0 flex flex-wrap content-start gap-[5mm] mx-auto rounded-sm relative z-0">
        {samples.map((sample) => (
          /* 📐 INDIVIDUAL STICKER (50mm x 25mm) */
          <div
            key={sample.id}
            className="barcode-label relative w-[50mm] h-[25mm] border border-slate-300 rounded-sm bg-white text-black font-sans flex flex-col justify-between p-[1mm] box-border overflow-hidden">
            {/* ROW 1: Header */}
            <div className="flex justify-between items-start pt-[1px] w-full">
              <div className="flex flex-col leading-none w-[70%]">
                {/* Name */}
                <span className="font-bold text-[10px] text-black uppercase truncate block w-full">
                  {sample.patient.name.substring(0, 18)}
                </span>
                {/* Age/Date */}
                <span className="text-[8px] text-slate-600 font-medium mt-[1px] block">
                  {sample.patient.age}/{sample.patient.gender?.charAt(0)} •{" "}
                  {format(
                    new Date(sample.collectedAt || new Date()),
                    "dd/MM/yy",
                  )}
                </span>
              </div>

              {/* Tube Badge */}
              <div className="bg-black text-white text-[8px] font-bold px-1 py-0.5 rounded-[1px] min-w-[10mm] text-center uppercase tracking-wider">
                {sample.containerType
                  ? sample.containerType.substring(0, 4)
                  : "GEN"}
              </div>
            </div>

            {/* ROW 2: Barcode */}
            <div className="flex justify-center items-center w-full h-[12mm] overflow-hidden -mt-1">
              <div className="transform scale-y-[0.85] scale-x-[0.95] origin-center">
                <Barcode
                  value={sample.sampleId}
                  height={30}
                  width={1.2}
                  fontSize={9}
                  displayValue={true}
                  margin={0}
                  textMargin={1}
                  background="transparent"
                />
              </div>
            </div>

            {/* ROW 3: Footer Line & Test Codes */}
            <div className="w-full mt-[1px]">
              <div className="border-t border-black w-full h-[1px] mb-[1px]"></div>
              <span className="text-[8px] font-bold text-black uppercase block text-center leading-none truncate">
                {sample.tests && sample.tests.length > 0
                  ? sample.tests.map((t: any) => t.testCode).join(", ")
                  : "ROUTINE"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function BarcodePage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen flex items-center justify-center bg-slate-50">
          <Loader2 className="animate-spin text-indigo-600 h-8 w-8" />
        </div>
      }>
      <BarcodePrintContent />
    </Suspense>
  );
}
