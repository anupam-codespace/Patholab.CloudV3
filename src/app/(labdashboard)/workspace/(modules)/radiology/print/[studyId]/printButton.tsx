"use client";

import { Printer } from "lucide-react";

export default function PrintButton() {
  return (
    <button 
      onClick={() => window.print()}
      className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2 rounded-lg font-bold shadow hover:bg-primary/90 transition-colors"
    >
      <Printer className="w-4 h-4" /> 
      <span>Print Report</span>
    </button>
  );
}