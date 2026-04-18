"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Microscope,
  LayoutDashboard,
  Search,
  LifeBuoy,
  Lightbulb,
  MousePointerClick,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export default function NotFound() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 md:p-8 selection:bg-indigo-500 selection:text-white">
      {/* Main Container - Asymmetric Split Screen */}
      <div className="w-full max-w-6xl bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden flex flex-col lg:flex-row min-h-[600px] animate-in fade-in zoom-in-95 duration-500 fill-mode-both">
        {/* === LEFT PANEL: VISUAL ANCHOR === */}
        <div className="lg:w-2/5 bg-slate-950 relative p-10 lg:p-12 flex flex-col items-center justify-center overflow-hidden text-center lg:text-left border-b lg:border-b-0 lg:border-r border-slate-800">
          {/* Decorative Background Elements */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-indigo-500/20 to-transparent opacity-50 blur-3xl pointer-events-none"></div>

          <div className="relative z-10 w-full flex flex-col items-center">
            {/* Glassmorphism Icon Container */}
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-6 rounded-3xl shadow-2xl mb-8 relative">
              <div className="absolute inset-0 bg-indigo-500 blur-2xl opacity-20 rounded-full animate-pulse"></div>
              <Microscope className="w-16 h-16 text-indigo-400 relative z-10" />
            </div>

            <div className="text-[8rem] lg:text-[10rem] font-black text-white leading-none tracking-tighter drop-shadow-2xl select-none">
              404
            </div>

            <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-bold uppercase tracking-widest">
              <MousePointerClick className="h-4 w-4" />
              Missing Route
            </div>
          </div>
        </div>

        {/* === RIGHT PANEL: ACTIONABLE CONTENT === */}
        <div className="lg:w-3/5 p-8 lg:p-16 flex flex-col justify-center bg-white relative">
          <div className="max-w-xl">
            <h1 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight mb-4">
              Sample not found.
            </h1>
            <p className="text-lg text-slate-500 font-medium leading-relaxed mb-10">
              Oops! The page you're looking for doesn't exist or has been moved.
              Don't worry, even the best labs sometimes lose track of a tube.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 mb-12">
              <Button
                onClick={() => router.back()}
                variant="outline"
                className="h-14 px-8 rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 font-bold text-base transition-all hover:-translate-y-0.5">
                <ArrowLeft className="w-5 h-5 mr-2" />
                Go Back
              </Button>

              <Link href="/workspace" className="flex-1">
                <Button className="w-full h-14 px-8 rounded-xl bg-slate-900 hover:bg-indigo-600 text-white font-bold text-base shadow-md hover:shadow-xl hover:shadow-indigo-500/20 transition-all hover:-translate-y-0.5">
                  <LayoutDashboard className="w-5 h-5 mr-2" />
                  Return to Dashboard
                </Button>
              </Link>
            </div>

            <Separator className="bg-slate-100 mb-8" />

            {/* Helper Grid (Bento Style) */}
            <div className="space-y-4">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-widest">
                Helpful Links
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-start gap-3 hover:border-indigo-200 transition-colors cursor-default">
                  <div className="bg-white p-2 rounded-lg shadow-sm shrink-0">
                    <Search className="w-4 h-4 text-slate-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">
                      Search Again
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 font-medium">
                      Use the global search bar in the header.
                    </p>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-start gap-3 hover:border-indigo-200 transition-colors cursor-default">
                  <div className="bg-white p-2 rounded-lg shadow-sm shrink-0">
                    <LifeBuoy className="w-4 h-4 text-slate-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">
                      Support
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 font-medium">
                      Contact support if you think this is a bug.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Fun Fact Callout */}
            <div className="mt-12 bg-indigo-50 border border-indigo-100 p-5 rounded-2xl flex gap-4 items-start">
              <div className="bg-indigo-100 p-2 rounded-xl shrink-0 mt-0.5">
                <Lightbulb className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-indigo-900 mb-1">
                  Did you know?
                </h4>
                <p className="text-xs text-indigo-700/80 font-medium leading-relaxed">
                  In a typical clinical environment, over 70% of medical
                  decisions are based directly on laboratory test results!
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
