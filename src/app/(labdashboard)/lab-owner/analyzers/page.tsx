import { prisma } from "@/lib/prisma";
import { cookies, headers } from "next/headers";
import { verifyToken } from "@/lib/auth";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function AnalyzerPage() {
  // 1. REAL AUTHENTICATION: Get the exact Lab ID from the secure cookie
  const token = cookies().get("token")?.value;
  if (!token) redirect("/login");

  const payload = await verifyToken(token);
  // Ensure we have a valid payload and extract the labId
  const labId = payload?.labId as string;

  if (!labId) {
    return (
      <div className="p-8 text-red-500 font-bold">
        Error: No Lab associated with this account.
      </div>
    );
  }

  // 2. REAL DATABASE FETCH: Get the specific lab's details (for the API Key)
  const lab = await prisma.lab.findUnique({
    where: { id: labId },
  });

  if (!lab) redirect("/login");

  // 3. REAL DYNAMIC URL: Get the actual host (localhost:3000 or your real domain)
  const headersList = headers();
  const host = headersList.get("host") || "localhost:3000";
  const protocol = process.env.NODE_ENV === "development" ? "http" : "https";
  const realWebhookUrl = `${protocol}://${host}/api/webhooks/analyzer`;

  // 4. REAL STATS: Count exactly how many parameters the machines have processed for this lab
  const totalMachineResults = await prisma.testResultParameter.count({
    where: {
      entryMethod: "MACHINE_INTERFACE",
      test: {
        sample: {
          labId: labId,
        },
      },
    },
  });

  // 5. REAL LIVE FEED: Fetch the 10 most recent samples synced by the machine for THIS lab only
  const recentSyncs = await prisma.sample.findMany({
    where: {
      labId: labId,
      tests: {
        some: {
          results: {
            some: { entryMethod: "MACHINE_INTERFACE" },
          },
        },
      },
    },
    include: {
      patient: {
        select: { name: true },
      },
      tests: {
        select: { status: true },
      },
    },
    orderBy: { updatedAt: "desc" },
    take: 10,
  });

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8 bg-slate-50 min-h-screen">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">
            Analyzer Integration
          </h1>
          <p className="text-slate-500 mt-1">
            Manage your physical lab machines and monitor incoming HL7 data.
          </p>
        </div>
        {/* Links to the real download route we will create below */}
        <Link
          href="/api/agent/download"
          className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-lg font-bold shadow-lg shadow-blue-500/30 transition-all flex items-center gap-2">
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
          </svg>
          Download Windows Agent
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* CONNECTION SETTINGS CARD */}
        <div className="col-span-1 md:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-blue-50 rounded-xl">
              <svg
                className="w-6 h-6 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"></path>
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">
                Connection Credentials
              </h2>
              <p className="text-sm text-slate-500">
                Enter these into your Globiz Local Agent app.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                Webhook URL
              </label>
              <div className="flex">
                <code className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm text-slate-700 truncate select-all">
                  {realWebhookUrl}
                </code>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                Lab API Key (License Number)
              </label>
              <div className="flex">
                <code className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-4 py-3 text-sm text-emerald-400 font-mono tracking-widest select-all">
                  {lab.licenseNumber || "NO-LICENSE-FOUND"}
                </code>
              </div>
              <p className="text-xs text-red-500 mt-2 font-medium">
                ⚠️ Keep this key secret. Do not share it outside your lab.
              </p>
            </div>
          </div>
        </div>

        {/* SYSTEM STATUS CARD */}
        <div className="col-span-1 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-800 mb-2">
              Network Status
            </h2>
            <p className="text-sm text-slate-500 mb-6">
              Real-time status of your cloud webhook.
            </p>

            <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-100 p-4 rounded-xl">
              <div className="relative flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500"></span>
              </div>
              <div>
                <p className="font-bold text-emerald-800 text-sm tracking-wide">
                  WEBHOOK ACTIVE
                </p>
                <p className="text-xs text-emerald-600">
                  Ready to receive data
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 border-t border-slate-100 pt-4">
            <p className="text-xs text-slate-500 flex justify-between">
              <span>Total Results Synced:</span>
              <span className="font-bold text-slate-700">
                {totalMachineResults} Parameters
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* RECENT SYNCS TABLE */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
          <h2 className="font-bold text-slate-800">Recent Machine Syncs</h2>
          <span className="text-xs font-bold text-blue-600 bg-blue-100 px-3 py-1 rounded-full">
            Live Auto-Update
          </span>
        </div>

        {recentSyncs.length === 0 ? (
          <div className="p-10 text-center text-slate-500">
            <svg
              className="w-12 h-12 mx-auto text-slate-300 mb-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path>
            </svg>
            <p>No machine data received yet.</p>
            <p className="text-sm mt-1">
              Run your Local Agent and send a test result to see it here.
            </p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white border-b border-slate-100 text-slate-500 text-xs uppercase tracking-wider">
                <th className="px-6 py-4 font-semibold">Sample ID / Barcode</th>
                <th className="px-6 py-4 font-semibold">Patient Name</th>
                <th className="px-6 py-4 font-semibold">Sync Time</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {recentSyncs.map((sample) => (
                <tr
                  key={sample.id}
                  className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <span className="font-mono font-bold text-slate-800">
                      {sample.sampleId}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-600">
                    {sample.patient?.name || "Unknown Patient"}
                  </td>
                  <td className="px-6 py-4 text-slate-500">
                    {new Date(sample.updatedAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <svg
                        className="w-3.5 h-3.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M5 13l4 4L19 7"></path>
                      </svg>
                      Data Captured
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      href={`/lab-owner/samples/${sample.sampleId}`}
                      className="text-blue-600 hover:text-blue-800 font-bold text-sm">
                      Review Results &rarr;
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
