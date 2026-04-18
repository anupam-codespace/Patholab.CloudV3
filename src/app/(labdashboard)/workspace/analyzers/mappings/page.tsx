import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function MachineMappingPage() {
  // 1. Authenticate & Get Lab ID (Logic Preserved)
  const token = cookies().get("token")?.value;
  if (!token) redirect("/login");

  const payload = await verifyToken(token);
  const labId = payload?.labId as string;
  if (!labId) redirect("/login");

  // 2. Fetch Data (Logic Preserved)
  const analyzers = await prisma.labAnalyzer.findMany({
    where: { labId },
    orderBy: { name: "asc" },
  });

  const mappings = await prisma.parameterMapping.findMany({
    where: { analyzer: { labId } },
    include: { analyzer: { select: { name: true, model: true } } },
    orderBy: { createdAt: "desc" },
  });

  // 4. Server Action: Add (Logic Preserved)
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
        where: { labAnalyzerId_machineCode: { labAnalyzerId, machineCode } },
        update: { parameterName },
        create: { labAnalyzerId, machineCode, parameterName },
      });
      revalidatePath("/workspace/analyzers/mappings");
    } catch (error) {
      console.error("Mapping Error:", error);
    }
  }

  // 5. Server Action: Delete (Logic Preserved)
  async function deleteMapping(formData: FormData) {
    "use server";
    const id = formData.get("id")?.toString();
    if (id) {
      await prisma.parameterMapping.delete({ where: { id } });
      revalidatePath("/workspace/analyzers/mappings");
    }
  }

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 md:p-8 lg:p-12">
      <div className="max-w-7xl mx-auto space-y-10">
        {/* Navigation & Header */}
        <header className="space-y-4">
          <Link
            href="/workspace/analyzers"
            className="group inline-flex items-center gap-2 text-slate-400 hover:text-blue-600 transition-colors text-xs font-bold uppercase tracking-widest">
            <svg
              className="w-4 h-4 transition-transform group-hover:-translate-x-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.5"
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to Analyzer Hub
          </Link>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h1 className="text-4xl font-black text-slate-900 tracking-tight">
                Machine <span className="text-blue-600">Dictionary</span>
              </h1>
              <p className="text-slate-500 font-medium mt-1">
                Map raw hardware signals to clinical database parameters.
              </p>
            </div>
            <div className="hidden md:block px-4 py-2 bg-white border border-slate-200 rounded-xl shadow-sm">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                Total Rules
              </p>
              <p className="text-xl font-black text-slate-700 tabular-nums">
                {mappings.length}
              </p>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Sidebar: Add Translation Rule */}
          <section className="lg:col-span-4 sticky top-8">
            <div className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <svg
                    className="w-5 h-5 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                    />
                  </svg>
                </div>
                <h2 className="text-lg font-bold text-slate-800">
                  Add Translation
                </h2>
              </div>

              {analyzers.length === 0 ? (
                <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl italic text-xs text-amber-700 leading-relaxed">
                  No analyzers detected. Please run the Local Agent to
                  auto-register hardware before mapping.
                </div>
              ) : (
                <form action={addMapping} className="space-y-5">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                      Select Machine
                    </label>
                    <select
                      name="labAnalyzerId"
                      required
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold focus:ring-2 focus:ring-blue-500/20 outline-none transition-all appearance-none cursor-pointer">
                      <option value="">-- Choose Analyzer --</option>
                      {analyzers.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name} ({a.model})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                      Machine Raw Code
                    </label>
                    <input
                      type="text"
                      name="machineCode"
                      required
                      placeholder="e.g., WBC-C"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-mono font-bold focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                      Target Parameter
                    </label>
                    <input
                      type="text"
                      name="parameterName"
                      required
                      placeholder="e.g., White Blood Cells"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-slate-900 hover:bg-black text-white font-bold py-4 rounded-xl shadow-lg shadow-slate-200 transition-all active:scale-[0.98] text-sm uppercase tracking-widest">
                    Authorize Rule
                  </button>
                </form>
              )}
            </div>
          </section>

          {/* Main Table: Active Rules */}
          <section className="lg:col-span-8">
            <div className="bg-white border border-slate-200 rounded-[2rem] shadow-sm overflow-hidden">
              <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h2 className="font-bold text-slate-800 tracking-tight flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Active Protocol Library
                </h2>
              </div>

              {mappings.length === 0 ? (
                <div className="p-20 text-center space-y-4">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300">
                    <svg
                      className="w-8 h-8"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                      />
                    </svg>
                  </div>
                  <p className="text-slate-400 font-medium italic">
                    Your translation library is empty.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="text-slate-400 text-[10px] font-black uppercase tracking-[0.15em] border-b border-slate-100">
                        <th className="px-8 py-5">Analyzer Node</th>
                        <th className="px-8 py-5">Machine In</th>
                        <th className="px-8 py-5">LIMS Output</th>
                        <th className="px-8 py-5 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {mappings.map((map) => (
                        <tr
                          key={map.id}
                          className="group hover:bg-slate-50/80 transition-colors">
                          <td className="px-8 py-5">
                            <div className="flex flex-col">
                              <span className="text-xs font-black text-slate-700 tracking-tight">
                                {map.analyzer.name}
                              </span>
                              <span className="text-[10px] font-bold text-slate-400 uppercase">
                                {map.analyzer.model}
                              </span>
                            </div>
                          </td>
                          <td className="px-8 py-5">
                            <span className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-mono font-black border border-blue-100">
                              {map.machineCode}
                            </span>
                          </td>
                          <td className="px-8 py-5">
                            <div className="flex items-center gap-2">
                              <svg
                                className="w-3 h-3 text-slate-300"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24">
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="3"
                                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                                />
                              </svg>
                              <span className="text-sm font-bold text-slate-600 tracking-tight">
                                {map.parameterName}
                              </span>
                            </div>
                          </td>
                          <td className="px-8 py-5 text-right">
                            <form action={deleteMapping}>
                              <input type="hidden" name="id" value={map.id} />
                              <button
                                type="submit"
                                className="opacity-0 group-hover:opacity-100 p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                                title="Remove Mapping">
                                <svg
                                  className="w-4 h-4"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24">
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                  />
                                </svg>
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
          </section>
        </div>
      </div>
    </div>
  );
}
