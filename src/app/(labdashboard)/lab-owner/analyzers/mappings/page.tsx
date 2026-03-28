import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function MachineMappingPage() {
  // 1. Authenticate & Get Lab ID
  const token = cookies().get("token")?.value;
  if (!token) redirect("/login");

  const payload = await verifyToken(token);
  const labId = payload?.labId as string;
    if (!labId) redirect("/login");
    
  // 2. Fetch all Analyzers registered to this Lab
  const analyzers = await prisma.labAnalyzer.findMany({
    where: { labId },
    // Changed from { createdAt: 'desc' } to { name: 'asc' }
    orderBy: { name: "asc" },
  });
  // 3. Fetch all active Mappings, including which machine they belong to
  const mappings = await prisma.parameterMapping.findMany({
    where: {
      analyzer: { labId },
    },
    include: {
      analyzer: { select: { name: true, model: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // 4. Server Action: Add a new mapping safely
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

  // 5. Server Action: Delete a mapping
  async function deleteMapping(formData: FormData) {
    "use server";
    const id = formData.get("id")?.toString();
    if (id) {
      await prisma.parameterMapping.delete({ where: { id } });
      revalidatePath("/lab-owner/analyzers/mappings");
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8 bg-slate-50 min-h-screen">
      {/* Header */}
      <div>
        <Link
          href="/lab-owner/analyzers"
          className="text-blue-600 text-sm font-bold hover:underline mb-2 inline-block">
          &larr; Back to Analyzer Hub
        </Link>
        <h1 className="text-3xl font-bold text-slate-800 tracking-tight">
          Machine Code Dictionary
        </h1>
        <p className="text-slate-500 mt-1">
          Teach your LIMS how to translate raw codes from specific physical
          machines into your database parameters.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Add New Mapping Form */}
        <div className="col-span-1 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm h-fit sticky top-6">
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <svg
              className="w-5 h-5 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"></path>
            </svg>
            Add Translation Rule
          </h2>

          {analyzers.length === 0 ? (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
              <p className="font-bold mb-1">No Machines Found!</p>
              <p>
                Please run your Local Agent and process at least one sample. The
                machine will auto-register here so you can map its codes.
              </p>
            </div>
          ) : (
            <form action={addMapping} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Select Machine
                </label>
                <select
                  name="labAnalyzerId"
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-700 font-medium">
                  <option value="">-- Choose an Analyzer --</option>
                  {analyzers.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.model})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Machine Sends (Raw Code)
                </label>
                <input
                  type="text"
                  name="machineCode"
                  required
                  placeholder="e.g., WBC-C"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Maps to Database Parameter
                </label>
                <input
                  type="text"
                  name="parameterName"
                  required
                  placeholder="e.g., Total Leukocyte Count"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg shadow-lg shadow-blue-500/30 transition-all active:scale-[0.98]">
                Save Rule
              </button>
            </form>
          )}
        </div>

        {/* Existing Mappings Table */}
        <div className="col-span-1 lg:col-span-2 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
          <div className="bg-slate-800 px-6 py-4 border-b border-slate-700">
            <h2 className="font-bold text-white tracking-wide">
              Active Translation Rules
            </h2>
          </div>

          {mappings.length === 0 ? (
            <div className="p-12 text-center text-slate-500 flex-1 flex flex-col justify-center">
              <svg
                className="w-12 h-12 mx-auto text-slate-300 mb-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
              </svg>
              <p className="font-medium text-slate-600">
                No mapping rules defined yet.
              </p>
              <p className="text-sm mt-1">
                If your machine's codes don't perfectly match your test
                parameter names, add a rule to translate them.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left border-collapse min-w-[500px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider">
                    <th className="px-6 py-4 font-semibold">Analyzer</th>
                    <th className="px-6 py-4 font-semibold">Machine Code</th>
                    <th className="px-6 py-4 font-semibold">
                      Database Parameter
                    </th>
                    <th className="px-6 py-4 font-semibold text-right">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {mappings.map((map) => (
                    <tr
                      key={map.id}
                      className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                          {map.analyzer.name}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono font-bold text-slate-700 bg-slate-50/50">
                        {map.machineCode}
                      </td>
                      <td className="px-6 py-4 font-medium text-emerald-600">
                        &rarr; {map.parameterName}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <form action={deleteMapping}>
                          <input type="hidden" name="id" value={map.id} />
                          <button
                            type="submit"
                            className="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-colors">
                            Remove
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
  );
}
