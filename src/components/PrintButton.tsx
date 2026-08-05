"use client";

import { Printer } from "lucide-react";

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="bg-slate-900 text-primary-foreground px-6 py-3 rounded-full shadow-xl font-bold hover:bg-slate-800 flex items-center gap-2 transition-transform active:scale-95">
      <Printer className="h-5 w-5" /> Print Report
    </button>
  );
}
