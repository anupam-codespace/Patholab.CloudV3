import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { revalidatePath } from "next/cache";

export default async function SampleReviewPage({
  params,
}: {
  params: { sampleId: string };
}) {
  // 1. Authenticate & Get Lab ID
  const token = cookies().get("token")?.value;
  if (!token) redirect("/login");

  const payload = await verifyToken(token);
  const labId = payload?.labId as string;
  if (!labId) redirect("/login");

  const { sampleId } = params;

  // 2. Fetch the Sample and its relational data
  const sample = await prisma.sample.findFirst({
    where: { sampleId: sampleId, labId: labId },
    include: {
      patient: true,
      tests: {
        include: {
          results: {
            orderBy: { order: "asc" },
            include: { analyzer: true },
          },
        },
      },
    },
  });

  if (!sample) {
    return (
      <div className="max-w-5xl mx-auto p-12 text-center mt-10 bg-white rounded-2xl border border-slate-200 shadow-sm">
        <svg
          className="w-16 h-16 mx-auto text-slate-300 mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
        <h1 className="text-2xl font-bold text-slate-800">Sample Not Found</h1>
        <p className="text-slate-500 mt-2">
          Barcode{" "}
          <span className="font-mono font-bold text-slate-700">{sampleId}</span>{" "}
          does not exist in your lab.
        </p>
        <Link
          href="/lab-owner/analyzers"
          className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-lg font-bold mt-6 inline-block transition-colors">
          &larr; Back to Dashboard
        </Link>
      </div>
    );
  }

  // 3. Server Action: Approve ALL Tests in this Sample
  async function approveAllResults() {
    "use server";
    try {
      // Mark all tests as APPROVED
      for (const test of sample!.tests) {
        await prisma.test.update({
          where: { id: test.id },
          data: {
            status: "APPROVED",
            approvedAt: new Date(),
          },
        });
      }
      // Update the main Sample status
      await prisma.sample.update({
        where: { id: sample!.id },
        data: { status: "PROCESSED" },
      });

      revalidatePath(`/lab-owner/samples/${sampleId}`);
    } catch (error) {
      console.error("Approval Error:", error);
    }
  }

  // Status checks to render dynamic UI
  const hasAbnormalResults = sample.tests.some((t) =>
    t.results.some((r) => r.isAbnormal),
  );
  const isFullyApproved = sample.tests.every(
    (t) => t.status === "APPROVED" || t.status === "DELIVERED",
  );

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6 bg-slate-50 min-h-screen pb-32">
      {/* 1. HEADER CARD */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <Link
            href="/lab-owner/analyzer"
            className="text-blue-600 text-sm font-bold hover:underline mb-3 inline-flex items-center gap-1">
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
            </svg>
            Back to Analyzer Hub
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-slate-800 tracking-tight">
              Sample{" "}
              <span className="font-mono text-blue-600 bg-blue-50 px-3 py-1 rounded-lg border border-blue-100">
                {sample.sampleId}
              </span>
            </h1>
            {isFullyApproved ? (
              <span className="px-3 py-1.5 bg-emerald-100 text-emerald-800 font-bold rounded-full text-xs uppercase tracking-wider border border-emerald-200">
                Verified & Approved
              </span>
            ) : (
              <span className="px-3 py-1.5 bg-amber-100 text-amber-800 font-bold rounded-full text-xs uppercase tracking-wider border border-amber-200">
                Pending Review
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-x-8 gap-y-2 mt-5 text-sm">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Patient Name
              </span>
              <span className="font-medium text-slate-800">
                {sample.patient.name}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Age / Gender
              </span>
              <span className="font-medium text-slate-800">
                {sample.patient.age} {sample.patient.ageUnit} •{" "}
                {sample.patient.gender}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Collected On
              </span>
              <span className="font-medium text-slate-800">
                {sample.collectedAt
                  ? new Date(sample.collectedAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "Unknown"}
              </span>
            </div>
          </div>
        </div>

        {hasAbnormalResults && !isFullyApproved && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-start gap-3 max-w-sm">
            <svg
              className="w-6 h-6 shrink-0 mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
            </svg>
            <div className="text-sm">
              <p className="font-bold">Abnormal Results Detected</p>
              <p className="mt-1 opacity-90 leading-snug">
                The machine flagged certain parameters as out of normal range.
                Please verify before approving.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 2. DYNAMIC TEST RESULTS LOOP */}
      <div className="space-y-6">
        {sample.tests.map((test) => {
          const isTestApproved =
            test.status === "APPROVED" || test.status === "DELIVERED";

          return (
            <div
              key={test.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
              {/* TEST HEADER WITH MANUAL EDIT LINK */}
              <div className="bg-slate-800 px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-white font-bold tracking-wide text-lg">
                      {test.testName}
                    </h2>
                    {isTestApproved && (
                      <svg
                        className="w-5 h-5 text-emerald-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                      </svg>
                    )}
                  </div>
                  <span className="text-slate-400 text-xs font-mono bg-slate-700/50 px-2 py-0.5 rounded mt-1 inline-block">
                    Code: {test.testCode}
                  </span>
                </div>

                {/* ALWAYS VISIBLE EDIT BUTTON LINKING TO PATIENT ID */}
                <Link
                  href={`/lab-owner/workflow/results/${sample.patientId}`}
                  className="bg-slate-700 hover:bg-blue-600 text-white text-sm font-bold py-2 px-4 rounded-lg transition-colors flex items-center gap-2 border border-slate-600 hover:border-blue-500">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                  </svg>
                  {isTestApproved ? "View / Edit Results" : "Edit Results"}
                </Link>
              </div>

              {/* PARAMETER TABLE */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider">
                      <th className="px-6 py-4 font-semibold w-1/4">
                        Parameter
                      </th>
                      <th className="px-6 py-4 font-semibold w-1/4">
                        Result Value
                      </th>
                      <th className="px-6 py-4 font-semibold w-1/6">Unit</th>
                      <th className="px-6 py-4 font-semibold w-1/6">
                        Ref. Range
                      </th>
                      <th className="px-6 py-4 font-semibold w-1/6 text-right">
                        Data Source
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {test.results.map((result) => (
                      <tr
                        key={result.id}
                        className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-medium text-slate-700">
                          {result.parameterName}
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span
                              className={`font-bold px-3 py-1.5 rounded-md text-[13px] border ${
                                result.isCritical
                                  ? "bg-red-600 text-white border-red-700 shadow-md shadow-red-500/20"
                                  : result.isAbnormal
                                    ? "bg-red-50 text-red-700 border-red-200"
                                    : result.value
                                      ? "bg-white text-slate-800 border-slate-200 shadow-sm"
                                      : "bg-transparent text-slate-400 font-normal italic border-dashed border-slate-300"
                              }`}>
                              {result.value || "Pending Entry..."}
                            </span>
                            {result.isAbnormal && !result.isCritical && (
                              <svg
                                className="w-5 h-5 text-red-500"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor">
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                              </svg>
                            )}
                          </div>
                        </td>

                        <td className="px-6 py-4 text-slate-500">
                          {result.unit || "-"}
                        </td>
                        <td className="px-6 py-4 text-slate-500 whitespace-pre-wrap leading-relaxed">
                          {result.refRangeText || "-"}
                        </td>

                        <td className="px-6 py-4 text-right">
                          {result.entryMethod === "MACHINE_INTERFACE" ? (
                            <div className="inline-flex flex-col items-end">
                              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1.5 rounded-md border border-emerald-200 uppercase tracking-widest">
                                <svg
                                  className="w-3.5 h-3.5"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor">
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                </svg>
                                Auto Sync
                              </span>
                              {result.analyzer && (
                                <span
                                  className="text-[10px] text-slate-400 mt-1.5 font-mono truncate max-w-[120px]"
                                  title={result.analyzer.name}>
                                  {result.analyzer.name}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2.5 py-1 rounded-md">
                              Manual
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}

                    {test.results.length === 0 && (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-6 py-10 text-center text-slate-500">
                          <p className="font-medium text-slate-600 mb-2">
                            No parameters found.
                          </p>
                          {/* Updated to use patientId here as well */}
                          <Link
                            href={`/lab-owner/workflow/results/${sample.patientId}`}
                            className="text-blue-600 font-bold hover:underline text-sm">
                            Click here to add results manually &rarr;
                          </Link>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. FLOATING ACTION FOOTER (Only shows if NOT approved) */}
      {!isFullyApproved && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] p-4 md:p-6 z-50">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 text-blue-600 p-2 rounded-full hidden sm:block">
                <svg
                  className="w-6 h-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
              <div>
                <p className="font-bold text-slate-800 text-sm md:text-base">
                  Ready to finalize this report?
                </p>
                <p className="text-xs text-slate-500">
                  Ensure all machine and manual entries are verified. Approval
                  locks the results.
                </p>
              </div>
            </div>

            <form action={approveAllResults} className="w-full sm:w-auto">
              <button
                type="submit"
                className="w-full sm:w-auto px-8 py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-xl shadow-blue-500/30 transition-all text-sm flex items-center justify-center gap-2 active:scale-[0.98]">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M5 13l4 4L19 7"></path>
                </svg>
                Verify & Approve All Tests
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
