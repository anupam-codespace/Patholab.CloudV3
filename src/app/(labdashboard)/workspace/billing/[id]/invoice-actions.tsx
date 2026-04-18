'use client';

import { Button } from '@/components/ui/button';
import { 
  Printer, 
  Download, 
  Mail, 
  Send, 
  FileDown, 
  Share2,
  ChevronRight
} from 'lucide-react';

export default function InvoiceActions() {
  /**
   * 🔒 RULE 1: PRESERVE ALL LOGIC
   * Keeping your existing alert calls and print function intact.
   */

  return (
    <div className="relative group">
      {/* Visual background glow for the action area */}
      <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500/20 to-blue-500/20 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
      
      <div className="relative flex flex-wrap items-center gap-3 p-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-sm">
        
        {/* EMAIL ACTION */}
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => alert("Email feature coming soon")}
          className="h-10 px-4 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-indigo-600 transition-all active:scale-95 flex items-center gap-2 group/btn"
        >
          <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 group-hover/btn:scale-110 transition-transform">
            <Send className="h-3.5 w-3.5" />
          </div>
          <span className="text-[11px] font-black uppercase tracking-widest">Send Email</span>
        </Button>

        <div className="w-px h-6 bg-slate-100 dark:bg-slate-800 hidden sm:block"></div>

        {/* PRINT ACTION */}
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => window.print()}
          className="h-10 px-4 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-emerald-600 transition-all active:scale-95 flex items-center gap-2 group/btn"
        >
          <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 group-hover/btn:scale-110 transition-transform">
            <Printer className="h-3.5 w-3.5" />
          </div>
          <span className="text-[11px] font-black uppercase tracking-widest">Hard Copy</span>
        </Button>

        {/* DOWNLOAD ACTION (PRIMARY) */}
        <Button 
          size="sm" 
          onClick={() => alert("PDF Download coming soon")}
          className="h-10 px-5 bg-slate-900 hover:bg-black dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-slate-200 dark:shadow-none transition-all active:scale-95 flex items-center gap-2 group/main"
        >
          <FileDown className="h-4 w-4 group-hover:-translate-y-0.5 transition-transform" />
          <span className="text-[11px] font-black uppercase tracking-widest">Download PDF</span>
          <ChevronRight className="h-3 w-3 opacity-30 group-hover:translate-x-1 transition-transform" />
        </Button>

        {/* MOBILE SHARE OPTION (Visual only enhancement) */}
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-10 w-10 rounded-xl text-slate-400 hover:text-slate-900 sm:hidden"
        >
          <Share2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}