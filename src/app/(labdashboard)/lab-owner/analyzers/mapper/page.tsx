import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { redirect } from "next/navigation";
import VisualMapper from "./VisualMapper";
import Link from "next/link";
import { ArrowLeft, Network, Cpu, Activity, Sparkles } from "lucide-react";

export default async function VisualMapperPage() {
  // 1. AUTHENTICATION (Strictly Preserved)
  const token = cookies().get("token")?.value;
  if (!token) redirect("/login");
  const payload = await verifyToken(token);
  const labId = payload?.labId as string;
  if (!labId) redirect("/login");

  // 2. DATA FETCHING (Strictly Preserved)
  // Fetch pending unmapped codes grouped by sample
  const unmappedQueue = await prisma.unmappedMachineCode.findMany({
    where: { labId },
    include: { analyzer: true },
    orderBy: { createdAt: "desc" },
  });

  // 3. DATA TRANSFORMATION (Strictly Preserved)
  // Group the unmapped codes by Sample ID so the UI is clean
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

  // 4. SERVER ACTION (Strictly Preserved)
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
        // 1. Create the permanent rule
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

        // 2. Remove it from the Unmapped Queue so it disappears from the UI
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

  const pendingSamplesCount = Object.keys(groupedQueue).length;

  return (
    <div className="min-h-screen bg-slate-50 relative font-sans selection:bg-indigo-500/30 pb-12">
      
      {/* --- Ambient Background --- */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.02] pointer-events-none mix-blend-overlay"></div>
      <div className="absolute top-0 left-0 w-full h-[400px] bg-gradient-to-b from-indigo-100/40 via-violet-50/20 to-transparent pointer-events-none"></div>

      <div className="max-w-[1600px] mx-auto p-4 md:p-8 relative z-10 space-y-8">
        
        {/* --- HEADER SECTION --- */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 bg-white/60 backdrop-blur-xl border border-white/60 shadow-sm rounded-3xl p-6 md:p-8">
          <div className="space-y-4">
            <Link
              href="/lab-owner/analyzer/mappings"
              className="inline-flex items-center text-sm font-bold text-indigo-600 hover:text-indigo-800 transition-colors group bg-indigo-50/50 hover:bg-indigo-50 px-3 py-1.5 rounded-lg"
            >
              <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" /> 
              Back to Dictionary
            </Link>

            <div className="space-y-2">
              <div className="flex items-center gap-3">
                 <div className="p-3 bg-gradient-to-br from-indigo-500 to-violet-600 text-white rounded-xl shadow-md shadow-indigo-500/20">
                    <Network className="w-6 h-6" />
                 </div>
                 <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
                   Visual Mapper
                 </h1>
              </div>
              <p className="text-sm md:text-base text-slate-500 font-medium max-w-2xl lg:ml-14">
                Connect incoming raw machine codes to your unified database parameters. The webhook intelligence engine feeds this queue automatically in real-time.
              </p>
            </div>
          </div>

          {/* Status Badge */}
          <div className="flex items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex-none">
            <div className={`p-2.5 rounded-xl ${pendingSamplesCount > 0 ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
               {pendingSamplesCount > 0 ? <Activity className="w-5 h-5 animate-pulse" /> : <Sparkles className="w-5 h-5" />}
            </div>
            <div>
               <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Queue Status</p>
               <p className="text-lg font-extrabold text-slate-800 leading-tight">
                 {pendingSamplesCount} {pendingSamplesCount === 1 ? 'Sample' : 'Samples'} Pending
               </p>
            </div>
          </div>
        </div>

        {/* --- MAIN WORKSPACE (VisualMapper Client Component Wrapper) --- */}
        <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60 overflow-hidden min-h-[500px]">
          {pendingSamplesCount === 0 ? (
            <div className="flex flex-col items-center justify-center h-[50vh] text-center p-6">
               <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mb-4 border border-emerald-100">
                  <Cpu className="w-10 h-10 text-emerald-500" />
               </div>
               <h3 className="text-xl font-extrabold text-slate-800">All Caught Up!</h3>
               <p className="text-slate-500 font-medium max-w-md mt-2">
                 Your dictionary is fully mapped. There are no unmapped machine codes waiting in the queue.
               </p>
            </div>
          ) : (
            <div className="p-2 md:p-6">
               <VisualMapper
                 queueData={Object.values(groupedQueue)}
                 saveMappingAction={saveMappings}
               />
            </div>
          )}
        </div>

      </div>
    </div>
  );
}