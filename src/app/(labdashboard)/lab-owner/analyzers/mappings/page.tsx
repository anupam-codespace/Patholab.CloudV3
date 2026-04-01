import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import Link from "next/link";
import { 
  ArrowLeft, Database, Cpu, Network, Plus, 
  Trash2, ArrowRight, ServerCrash, SearchX
} from "lucide-react";

export default async function MachineMappingPage() {
  // 1. Authenticate & Get Lab ID (Strictly Preserved)
  const token = cookies().get("token")?.value;
  if (!token) redirect("/login");

  const payload = await verifyToken(token);
  const labId = payload?.labId as string;
  if (!labId) redirect("/login");
    
  // 2. Fetch all Analyzers registered to this Lab (Strictly Preserved)
  const analyzers = await prisma.labAnalyzer.findMany({
    where: { labId },
    orderBy: { name: "asc" },
  });

  // 3. Fetch all active Mappings, including which machine they belong to (Strictly Preserved)
  const mappings = await prisma.parameterMapping.findMany({
    where: {
      analyzer: { labId },
    },
    include: {
      analyzer: { select: { name: true, model: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // 4. Server Action: Add a new mapping safely (Strictly Preserved)
  async function addMapping(formData: FormData) {
    "use server";
    const labAnalyzerId = formData.get("labAnalyzerId")?.toString();
    const machineCode = formData
      .get("machineCode")
      ?.toString()
      .toUpperCase()
      .trim();
    const parameterName = formData.get("parameterName")?.toString().trim();

    if (!labAnalyzerId || !machineCode || !parameterName) return;

    try {
      await prisma.parameterMapping.upsert({
        where: {
          labAnalyzerId_machineCode: { labAnalyzerId, machineCode },
        },
        update: { parameterName },
        create: { labAnalyzerId, machineCode, parameterName },
      });
      revalidatePath("/lab-owner/analyzers/mappings");
    } catch (error) {
      console.error("Mapping Error:", error);
    }
  }

  // 5. Server Action: Delete a mapping (Strictly Preserved)
  async function deleteMapping(formData: FormData) {
    "use server";
    const id = formData.get("id")?.toString();
    if (id) {
      await prisma.parameterMapping.delete({ where: { id } });
      revalidatePath("/lab-owner/analyzers/mappings");
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 relative font-sans selection:bg-indigo-500/30 pb-12">
      
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.02] pointer-events-none mix-blend-overlay"></div>
      <div className="absolute top-0 left-0 w-full h-[400px] bg-gradient-to-b from-indigo-100/40 via-violet-50/20 to-transparent pointer-events-none"></div>

      <div className="max-w-[1600px] mx-auto p-4 md:p-8 relative z-10 space-y-8">
        
        {/* --- HEADER SECTION --- */}
        <div className="bg-white/60 backdrop-blur-xl border border-white/60 shadow-sm rounded-3xl p-6 md:p-8 transition-all duration-300">
          <Link
            href="/lab-owner/analyzers"
            className="inline-flex items-center text-sm font-bold text-indigo-600 hover:text-indigo-800 transition-colors group bg-indigo-50/50 hover:bg-indigo-50 px-3 py-1.5 rounded-lg mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" /> 
            Back to Analyzer Hub
          </Link>
          
          <div className="flex items-center gap-4 mb-2">
             <div className="p-3 bg-gradient-to-br from-indigo-500 to-violet-600 text-white rounded-xl shadow-md shadow-indigo-500/20">
                <Database className="w-6 h-6" />
             </div>
             <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
               Machine Code Dictionary
             </h1>
          </div>
          <p className="text-sm md:text-base text-slate-500 font-medium max-w-2xl lg:ml-[4.5rem]">
            Teach your LIMS how to translate raw hardware codes from specific physical machines into your unified database parameters.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* --- LEFT: ADD NEW MAPPING FORM (4 Cols) --- */}
          <div className="lg:col-span-4 lg:sticky lg:top-8 h-fit">
            <div className="bg-white/80 backdrop-blur-xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-3xl overflow-hidden">
              <div className="bg-slate-900 px-6 py-5 border-b border-slate-800 flex items-center gap-3">
                 <div className="p-1.5 bg-indigo-500/20 rounded-lg">
                   <Network className="w-5 h-5 text-indigo-400" />
                 </div>
                 <h2 className="text-lg font-bold text-white tracking-wide">
                   Add Translation Rule
                 </h2>
              </div>

              <div className="p-6 md:p-8 bg-slate-50/30">
                {analyzers.length === 0 ? (
                  <div className="p-5 bg-amber-50 border border-amber-200/60 rounded-2xl flex items-start gap-4 shadow-sm">
                    <ServerCrash className="w-6 h-6 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-extrabold text-amber-900 mb-1 tracking-tight text-sm">No Machines Found!</p>
                      <p className="text-xs text-amber-700 font-medium leading-relaxed">
                        Please run your Local Agent and process at least one sample. The machine will auto-register here so you can map its codes.
                      </p>
                    </div>
                  </div>
                ) : (
                  <form action={addMapping} className="space-y-5">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                        <Cpu className="w-3.5 h-3.5" /> Select Hardware
                      </label>
                      <select
                        name="labAnalyzerId"
                        required
                        className="w-full h-11 bg-white border border-slate-200 rounded-xl px-4 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-slate-700 font-semibold shadow-sm transition-all appearance-none cursor-pointer"
                        style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: `right .5rem center`, backgroundRepeat: `no-repeat`, backgroundSize: `1.5em 1.5em` }}
                      >
                        <option value="" disabled selected>-- Choose an Analyzer --</option>
                        {analyzers.map((a) => (
                          <option key={a.id} value={a.id} className="font-medium">
                            {a.name} ({a.model})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Machine Sends (Raw Code)
                      </label>
                      <input
                        type="text"
                        name="machineCode"
                        required
                        placeholder="e.g., WBC-C, LYM%"
                        className="w-full h-11 bg-white border border-slate-200 rounded-xl px-4 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 font-mono font-bold text-slate-800 placeholder:font-sans placeholder:font-medium placeholder:text-slate-400 shadow-sm transition-all uppercase"
                      />
                    </div>

                    <div className="flex justify-center -my-2 relative z-10 pointer-events-none">
                       <div className="bg-slate-100 p-1.5 rounded-full border border-slate-200 shadow-sm text-slate-400">
                          <ArrowRight className="w-4 h-4 rotate-90" />
                       </div>
                    </div>

                    <div className="space-y-2 relative z-0">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Maps to Database Parameter
                      </label>
                      <input
                        type="text"
                        name="parameterName"
                        required
                        placeholder="e.g., Total Leukocyte Count"
                        className="w-full h-11 bg-white border border-slate-200 rounded-xl px-4 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 font-semibold text-slate-800 placeholder:font-medium placeholder:text-slate-400 shadow-sm transition-all"
                      />
                    </div>

                    <div className="pt-2">
                        <button
                          type="submit"
                          className="w-full h-12 bg-slate-900 hover:bg-indigo-600 text-white font-extrabold rounded-xl shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center gap-2 group"
                        >
                          <Plus className="w-4 h-4 text-indigo-400 group-hover:text-white transition-colors" />
                          Save Mapping Rule
                        </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>

          {/* --- RIGHT: EXISTING MAPPINGS TABLE (8 Cols) --- */}
          <div className="lg:col-span-8">
            <div className="bg-white/80 backdrop-blur-xl border border-white/60 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden flex flex-col h-full min-h-[500px]">
              
              <div className="bg-slate-900 px-6 py-5 border-b border-slate-800 flex justify-between items-center relative overflow-hidden">
                 <div className="absolute right-0 top-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
                 <h2 className="font-bold text-white tracking-wide relative z-10">
                   Active Translation Rules
                 </h2>
                 <span className="bg-white/10 text-white px-3 py-1 rounded-lg text-xs font-bold border border-white/10 relative z-10 backdrop-blur-sm">
                    {mappings.length} {mappings.length === 1 ? 'Rule' : 'Rules'}
                 </span>
              </div>

              {mappings.length === 0 ? (
                <div className="p-12 text-center flex-1 flex flex-col items-center justify-center bg-slate-50/30">
                  <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4 border border-slate-200 shadow-inner">
                     <SearchX className="w-10 h-10 text-slate-400" />
                  </div>
                  <h3 className="text-lg font-extrabold text-slate-800 tracking-tight">
                    No mapping rules defined yet.
                  </h3>
                  <p className="text-sm font-medium text-slate-500 mt-2 max-w-sm leading-relaxed">
                    If your machine's codes don't perfectly match your test
                    parameter names, add a rule on the left to seamlessly translate them.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto flex-1 bg-white/30">
                  <table className="w-full text-left border-collapse min-w-[600px]">
                    <thead>
                      <tr className="bg-slate-50/50 border-b border-slate-100/80 text-slate-500 text-[10px] uppercase tracking-wider">
                        <th className="px-6 py-4 font-extrabold">Hardware Source</th>
                        <th className="px-6 py-4 font-extrabold">Raw Machine Code</th>
                        <th className="px-6 py-4 font-extrabold">Target Parameter</th>
                        <th className="px-6 py-4 font-extrabold text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100/80 text-sm">
                      {mappings.map((map) => (
                        <tr
                          key={map.id}
                          className="hover:bg-indigo-50/30 transition-colors group"
                        >
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 shadow-sm">
                              <Cpu className="w-3.5 h-3.5 opacity-70" />
                              {map.analyzer.name}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                             <span className="font-mono font-extrabold text-sm text-slate-800 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-md shadow-sm inline-block">
                               {map.machineCode}
                             </span>
                          </td>
                          <td className="px-6 py-4">
                             <div className="flex items-center gap-2.5">
                                <ArrowRight className="w-4 h-4 text-slate-300" />
                                <span className="font-extrabold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-100/50 shadow-sm">
                                   {map.parameterName}
                                </span>
                             </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <form action={deleteMapping}>
                              <input type="hidden" name="id" value={map.id} />
                              <button
                                type="submit"
                                title="Remove Rule"
                                className="inline-flex items-center justify-center w-9 h-9 text-slate-400 hover:text-rose-600 bg-white hover:bg-rose-50 border border-transparent hover:border-rose-200 rounded-xl transition-all shadow-sm opacity-0 group-hover:opacity-100 focus:opacity-100"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </form>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}