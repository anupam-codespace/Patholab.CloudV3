'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2, Printer } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import Barcode from 'react-barcode';

function BarcodePrintContent() {
  const searchParams = useSearchParams();
  const invoiceId = searchParams.get('invoiceId');
  const [samples, setSamples] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!invoiceId) return;

    fetch(`/api/lab-owner/barcodes/${invoiceId}`)
      .then(res => res.json())
      .then(data => {
         setSamples(data);
         setLoading(false);
      })
      .catch(err => {
         console.error("Error fetching barcodes:", err);
         setLoading(false);
      });
  }, [invoiceId]);

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-blue-600" /></div>;
  
  if (samples.length === 0) return <div className="p-10 text-center text-slate-500">No samples found for this invoice.</div>;

  return (
    // ✅ REMOVED 'min-h-screen' here to prevent forcing height in print mode
    <div className="flex flex-col items-center p-8 bg-slate-100 min-h-screen print:bg-white print:p-0 print:min-h-0 print:block">
      
      {/* ✅ STRICT PRINT CSS */}
      <style jsx global>{`
        @media print {
           @page {
             size: A4 portrait;
             margin: 10mm; 
           }

           /* Reset Body/HTML to prevent overflow pages */
           html, body {
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
           #printable-area, #printable-area * {
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
             border: 1px dashed #ccc; /* Guide for cutting */
           }
        }
      `}</style>

      {/* --- CONTROLS (Hidden when printing) --- */}
      <div className="mb-8 print:hidden flex flex-col items-center gap-4 w-full max-w-4xl">
         <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 text-blue-800 max-w-md text-sm text-center">
            <p className="font-bold">🖨️ A4 Print Ready</p>
            <p>Make sure to select <strong>A4</strong> paper size in your printer settings.</p>
         </div>
         <Button onClick={() => window.print()} className="bg-blue-600 hover:bg-blue-700 w-48 shadow-md">
            <Printer className="mr-2 h-4 w-4"/> Print Labels
         </Button>
      </div>

      {/* --- PRINTABLE AREA --- */}
      {/* Added width constraint to simulate A4 width on screen for better preview */}
      <div id="printable-area" className="bg-white p-8 shadow-xl print:shadow-none print:p-0 print:bg-transparent w-[210mm] flex flex-wrap content-start gap-4 mx-auto">
         
         {samples.map((sample) => (
            /* 📐 INDIVIDUAL STICKER (50mm x 25mm) */
            <div key={sample.id} className="barcode-label relative w-[50mm] h-[25mm] border border-slate-300 rounded-sm bg-white text-black font-sans flex flex-col justify-between p-[1mm] box-border overflow-hidden">
               
               {/* ROW 1: Header */}
               <div className="flex justify-between items-start pt-[1px] w-full">
                  <div className="flex flex-col leading-none w-[70%]">
                      {/* Name */}
                      <span className="font-bold text-[10px] text-black uppercase truncate block w-full">
                          {sample.patient.name.substring(0, 18)}
                      </span>
                      {/* Age/Date */}
                      <span className="text-[8px] text-slate-600 font-medium mt-[1px] block">
                          {sample.patient.age}/{sample.patient.gender?.charAt(0)} • {format(new Date(sample.collectedAt || new Date()), 'dd/MM/yy')}
                      </span>
                  </div>
                  
                  {/* Tube Badge */}
                  <div className="bg-black text-white text-[8px] font-bold px-1 py-0.5 rounded-[1px] min-w-[10mm] text-center">
                      {sample.containerType ? sample.containerType.substring(0, 4).toUpperCase() : "GEN"}
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
                    {sample.tests.map((t: any) => t.testCode).join(', ') || "ROUTINE"}
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
        <Suspense fallback={<div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin"/></div>}>
            <BarcodePrintContent />
        </Suspense>
    );
}