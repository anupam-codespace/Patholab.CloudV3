// FILE: src/components/common/BarcodeDisplay.tsx
// Display and Print Barcode Component
// ==========================================
'use client';

import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Printer } from 'lucide-react';
import JsBarcode from 'jsbarcode';
import { BarcodeGenerator } from '@/lib/barcode-generator';

interface BarcodeDisplayProps {
  value: string;
  patientName?: string;
  showActions?: boolean;
}

export function BarcodeDisplay({ value, patientName, showActions = true }: BarcodeDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current) {
      JsBarcode(canvasRef.current, value, {
        format: 'CODE128',
        width: 2,
        height: 50,
        displayValue: true,
        fontSize: 12,
      });
    }
  }, [value]);

  return (
    <div className="flex flex-col items-center gap-4 p-4 border rounded-lg bg-card">
      <canvas ref={canvasRef} />
      
      {showActions && (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => BarcodeGenerator.generateAndDownload(value)}
          >
            <Download className="mr-2 h-4 w-4" />
            Download
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => BarcodeGenerator.printBarcode(value, patientName || 'Unknown')}
          >
            <Printer className="mr-2 h-4 w-4" />
            Print Label
          </Button>
        </div>
      )}
    </div>
  );
}