'use client';

import React from 'react';
import Barcode from 'react-barcode';

interface StickerProps {
  sampleId: string;      // The Barcode String (e.g. "240127-1001")
  patientName: string;   // e.g. "John Doe"
  ageGender: string;     // e.g. "25/M"
  containerType: string; // e.g. "EDTA", "SERUM"
  testCodes: string;     // e.g. "CBC, ESR"
  date: string;
}

export const BarcodeSticker = ({ 
  sampleId, patientName, ageGender, containerType, testCodes, date 
}: StickerProps) => {
  return (
    <div className="flex flex-col items-center justify-between bg-card text-black overflow-hidden box-border"
         style={{ 
             width: '50mm', 
             height: '25mm', 
             padding: '1mm',
             border: '1px solid #ddd' // Visible border for preview, removed in print CSS usually
         }}>
      
      {/* 1. Header: Patient Info & Container Type */}
      <div className="w-full flex justify-between items-end border-b border-black pb-[1px] mb-[1px]">
        <div className="flex flex-col max-w-[32mm]">
             <span className="text-[9px] font-bold leading-none truncate block">
                {patientName.substring(0, 18)}
             </span>
             <span className="text-[7px] leading-none mt-[1px]">
                {ageGender} • {date}
             </span>
        </div>
        <div className="bg-black text-primary-foreground px-1 py-[1px] rounded-[1px]">
             <span className="text-[8px] font-bold uppercase block leading-none">
                {containerType.substring(0, 4)}
             </span>
        </div>
      </div>

      {/* 2. The Barcode */}
      <div className="flex-1 flex items-center justify-center w-full overflow-hidden">
        <Barcode 
          value={sampleId}
          width={1.3}        // Width of bars (adjust for scanner)
          height={28}        // Height of bars
          fontSize={8}       // Size of the numbers below bars
          margin={0}
          displayValue={true} 
          format="CODE128"
        />
      </div>

      {/* 3. Footer: Test List */}
      <div className="w-full text-center border-t border-black pt-[1px] mt-[1px]">
        <span className="text-[7px] font-bold block truncate leading-none">
            {testCodes}
        </span>
      </div>
    </div>
  );
};