import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { redirect } from "next/navigation";
import VisualMapper from "./VisualMapper";
import Link from "next/link";
import {
  ArrowLeft,
  Binary,
  Workflow,
  Database,
  Zap,
  History,
  Info,
} from "lucide-react";

export default async function VisualMapperPage() {
  /** 🔒 RULE 1: PRESERVE ALL LOGIC */
  const token = cookies().get("token")?.value;
  if (!token) redirect("/login");
  const payload = await verifyToken(token);
  const labId = payload?.labId as string;
  if (!labId) redirect("/login");

  // Fetch pending unmapped codes grouped by sample
  const unmappedQueue = await prisma.unmappedMachineCode.findMany({
    where: { labId },
    include: { analyzer: true },
    orderBy: { createdAt: "desc" },
  });

  // Group the unmapped codes by Sample ID
  const groupedQueue = unmappedQueue.reduce(
    (acc, curr) => {
      if (!acc[curr.sampleId]) {
        acc[curr.sampleId] = {
          sampleId: curr.sampleId,
          analyzerId: curr.analyzer.id,
          analyzerName: curr.analyzer.name,
          machineCodes: [],
        };
      }
      acc[curr.sampleId].machineCodes.push(curr.machineCode);
      return acc;
    },
    {} as Record<string, any>,
  );

  // Secure Server Action: Save Mapping & Clear Queue
  async function saveMappings(
    mappings: {
      labAnalyzerId: string;
      sampleId: string;
      machineCode: string;
      parameterName: string;
    }[],
  ) {
    "use server";
    try {
      for (const map of mappings) {
        await prisma.parameterMapping.upsert({
          where: {
            labAnalyzerId_machineCode: {
              labAnalyzerId: map.labAnalyzerId,
              machineCode: map.machineCode,
            },
          },
          update: { parameterName: map.parameterName },
          create: {
            labAnalyzerId: map.labAnalyzerId,
            machineCode: map.machineCode,
            parameterName: map.parameterName,
          },
        });

        await prisma.unmappedMachineCode.deleteMany({
          where: {
            labAnalyzerId: map.labAnalyzerId,
            machineCode: map.machineCode,
          },
        });
      }
      return true;
    } catch (error) {
      console.error("Failed to save mappings:", error);
      return false;
    }
  }

  /** 🎨 RULE 2: REIMAGINED UI (Modern Workflow Interface) */
  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-slate-950 p-4 md:p-8 lg:p-12 font-sans selection:bg-indigo-100">
      {/* HEADER SECTION */}
      <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-3">
          <Link
            href="/workspace/analyzer/mappings"
            className="group inline-flex items-center gap-2 text-slate-400 hover:text-indigo-600 transition-colors text-xs font-black uppercase tracking-widest">
            <ArrowLeft className="w-3 h-3 transition-transform group-hover:-translate-x-1" />
            Back to Dictionary
          </Link>

          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:border-indigo-800 mb-2">
              <Binary className="w-4 h-4" />
              <span className="text-[10px] font-bold tracking-widest uppercase">
                Protocol Mapping
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 dark:text-white">
              Visual{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">
                Mapper
              </span>
            </h1>
            <p className="text-slate-500 font-medium italic max-w-2xl">
              Translate incoming hardware signals into clinical parameters. Data
              identified by the analyzer webhook is queued below for routing.
            </p>
          </div>
        </div>

        {/* System Stats Highlight */}
        <div className="hidden lg:flex items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
          <div className="p-3 bg-emerald-50 rounded-xl">
            <Zap className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">
              Queue Status
            </p>
            <p className="text-sm font-bold text-slate-900 dark:text-white uppercase tabular-nums">
              {Object.keys(groupedQueue).length} Pending Batches
            </p>
          </div>
        </div>
      </header>

      {/* MAIN INTERFACE GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* LEFT COLUMN: THE VISUAL MAPPER CANVAS */}
        <div className="lg:col-span-8">
          <div className="bg-white dark:bg-slate-900 rounded-[32px] p-2 md:p-6 shadow-[0_20px_50px_rgba(0,0,0,0.02)] border border-slate-100 dark:border-slate-800 min-h-[600px] relative overflow-hidden">
            {/* Subtle background decoration */}
            <div className="absolute top-0 right-0 p-8 opacity-[0.02] pointer-events-none">
              <Workflow className="w-64 h-64" />
            </div>

            <VisualMapper
              queueData={Object.values(groupedQueue)}
              saveMappingAction={saveMappings}
            />
          </div>
        </div>

        {/* RIGHT COLUMN: INSTRUCTIONAL SIDEBAR */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-slate-900 rounded-[32px] p-8 text-white shadow-2xl relative overflow-hidden group">
            <div className="absolute -right-12 -top-12 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl group-hover:bg-indigo-500/20 transition-all duration-1000" />

            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-indigo-400 flex items-center gap-2 mb-6">
              <Info className="w-4 h-4" /> Mapper Guide
            </h3>

            <div className="space-y-6 relative z-10">
              <div className="flex gap-4">
                <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center shrink-0 font-black text-xs">
                  1
                </div>
                <p className="text-sm text-slate-300 leading-relaxed">
                  Identify the{" "}
                  <span className="text-white font-bold italic">
                    Machine Code
                  </span>{" "}
                  sent by your analyzer (e.g., "GLU" or "HGB").
                </p>
              </div>
              <div className="flex gap-4">
                <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center shrink-0 font-black text-xs">
                  2
                </div>
                <p className="text-sm text-slate-300 leading-relaxed">
                  Match it to the corresponding{" "}
                  <span className="text-white font-bold italic">
                    Database Parameter
                  </span>{" "}
                  in your LIS dictionary.
                </p>
              </div>
              <div className="flex gap-4">
                <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center shrink-0 font-black text-xs">
                  3
                </div>
                <p className="text-sm text-slate-300 leading-relaxed">
                  Save the mapping to permanently automate this test route for
                  all future samples.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-[32px] p-8 border border-slate-100 dark:border-slate-800 shadow-sm">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
              <History className="w-4 h-4" /> Recent Handshakes
            </h3>
            <div className="space-y-4">
              {unmappedQueue.slice(0, 3).map((item, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between border-b border-slate-50 dark:border-slate-800 pb-3 last:border-0">
                  <div>
                    <p className="text-[11px] font-black text-slate-700 dark:text-slate-200 uppercase tracking-tighter">
                      Code: {item.machineCode}
                    </p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase">
                      {item.analyzer.name}
                    </p>
                  </div>
                  <span className="text-[9px] font-mono text-slate-300">
                    {item.createdAt.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              ))}
              {unmappedQueue.length === 0 && (
                <p className="text-xs text-slate-400 italic">
                  No recent queue activity.
                </p>
              )}
            </div>
          </div>

          <div className="p-6 rounded-[24px] bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50">
            <div className="flex items-center gap-2 mb-2 text-indigo-600 dark:text-indigo-400">
              <Database className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-widest">
                Automation Tip
              </span>
            </div>
            <p className="text-[11px] text-indigo-800 dark:text-indigo-300 leading-relaxed font-medium">
              Mappings are lab-wide. Once you map a machine code for one
              analyzer, it applies to all samples processed through that
              specific hardware interface.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
