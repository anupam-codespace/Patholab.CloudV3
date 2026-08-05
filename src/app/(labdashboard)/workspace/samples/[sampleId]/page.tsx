import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { format } from "date-fns";
import {
  ArrowLeft,
  Beaker,
  CheckCircle2,
  ShieldAlert,
  Activity,
  FileText,
  Server,
  AlertTriangle,
} from "lucide-react";

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
      <div className="min-h-[calc(100vh-4rem)] bg-muted/30 font-sans flex items-center justify-center p-6">
        <div className="bg-card rounded-3xl border border-slate-200/60 p-12 text-center shadow-xl shadow-slate-200/40 max-w-md w-full">
          <div className="h-20 w-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
            <Beaker className="h-10 w-10 text-slate-300" />
          </div>
          <h1 className="text-2xl font-black text-foreground tracking-tight">
            Sample Not Found
          </h1>
          <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
            Barcode{" "}
            <span className="font-mono font-bold text-foreground/80 bg-muted px-1.5 py-0.5 rounded">
              {sampleId}
            </span>{" "}
            does not exist in your lab database.
          </p>
          <Link href="/workspace/analyzers">
            <button className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-3 rounded-xl font-bold mt-8 transition-all hover:-translate-y-0.5 shadow-md w-full">
              Back to Dashboard
            </button>
          </Link>
        </div>
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

      revalidatePath(`/workspace/samples/${sampleId}`);
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
    <div className="min-h-[calc(100vh-4rem)] bg-muted/30 font-sans relative selection:bg-indigo-100 pb-32">
      {/* Decorative Background Mesh */}
      <div className="absolute top-0 inset-x-0 h-64 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-100/40 via-slate-50 to-transparent pointer-events-none z-0" />

      {/* FLOATING HEADER */}
      <header className="sticky top-0 z-30 bg-card/70 backdrop-blur-xl border-b border-slate-200/60 shadow-sm">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link
            href="/workspace/analyzer"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:text-indigo-800 transition-colors mb-3">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Analyzer Hub
          </Link>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 bg-gradient-to-br from-indigo-500 to-primary rounded-xl flex items-center justify-center shadow-inner shrink-0">
                <Beaker className="h-6 w-6 text-white" />
              </div>
              <div className="min-w-0 flex flex-col items-start gap-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-black text-foreground tracking-tight leading-tight">
                    Sample
                  </h1>
                  <span className="font-mono text-sm font-bold text-primary bg-indigo-50 px-2.5 py-0.5 rounded-md border border-indigo-100 shadow-sm mt-0.5">
                    {sample.sampleId}
                  </span>
                </div>
                {isFullyApproved ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-50 text-primary border border-emerald-200 rounded uppercase tracking-wider flex items-center gap-1 shadow-sm">
                    <CheckCircle2 className="h-3 w-3" /> Verified & Approved
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded uppercase tracking-wider flex items-center gap-1 shadow-sm">
                    <Activity className="h-3 w-3 animate-pulse" /> Pending
                    Review
                  </span>
                )}
              </div>
            </div>

            {hasAbnormalResults && !isFullyApproved && (
              <div className="bg-rose-50 border border-rose-200 p-3 rounded-xl flex items-start gap-3 max-w-sm shadow-sm shrink-0 w-full md:w-auto">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-bold text-rose-900 uppercase tracking-wider">
                    Abnormal Results
                  </p>
                  <p className="mt-0.5 text-rose-700 leading-snug font-medium">
                    Analyzer flagged parameters out of range. Review carefully.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10 space-y-6">
        {/* PATIENT CONTEXT BAR */}
        <div className="bg-card p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-wrap gap-x-8 gap-y-4">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-wider">
              Patient Name
            </span>
            <span className="font-bold text-foreground text-sm mt-0.5">
              {sample.patient.name}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-wider">
              Age / Gender
            </span>
            <span className="font-bold text-foreground text-sm mt-0.5">
              {sample.patient.age} {sample.patient.ageUnit.charAt(0)} •{" "}
              {sample.patient.gender}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-wider">
              Collection Date
            </span>
            <span className="font-bold text-foreground text-sm mt-0.5">
              {sample.collectedAt
                ? format(new Date(sample.collectedAt), "dd MMM yyyy, hh:mm a")
                : "Unknown"}
            </span>
          </div>
        </div>

        {/* DYNAMIC TEST RESULTS LOOP */}
        <div className="space-y-8">
          {sample.tests.map((test) => {
            const isTestApproved =
              test.status === "APPROVED" || test.status === "DELIVERED";

            return (
              <div
                key={test.id}
                className="bg-card rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col">
                {/* TEST HEADER */}
                <div className="bg-slate-900 px-6 py-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <h2 className="text-white font-black tracking-tight text-lg">
                        {test.testName}
                      </h2>
                      {isTestApproved && (
                        <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                      )}
                    </div>
                    <span className="text-muted-foreground/70 text-xs font-mono font-bold bg-slate-800 px-2 py-0.5 rounded mt-1.5 inline-block border border-slate-700 shadow-inner">
                      CODE: {test.testCode}
                    </span>
                  </div>

                  <Link
                    href={`/workspace/workflow/results/${sample.patientId}`}
                    className="bg-primary hover:bg-indigo-500 text-primary-foreground text-xs font-bold py-2.5 px-5 rounded-xl transition-all shadow-md flex items-center gap-2 border border-indigo-500 w-full sm:w-auto justify-center hover:-translate-y-0.5">
                    <FileText className="h-4 w-4" />
                    {isTestApproved
                      ? "View Full Record"
                      : "Edit Manual Results"}
                  </Link>
                </div>

                {/* PARAMETER TABLE */}
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left border-collapse min-w-[700px]">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-200/80 text-muted-foreground text-[10px] font-bold uppercase tracking-wider">
                        <th className="px-6 py-4 w-1/4">Parameter</th>
                        <th className="px-6 py-4 w-1/4">Result Value</th>
                        <th className="px-6 py-4 w-1/6">Unit</th>
                        <th className="px-6 py-4 w-1/6">Ref. Range</th>
                        <th className="px-6 py-4 w-1/6 text-right">
                          Data Source
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {test.results.map((result) => (
                        <tr
                          key={result.id}
                          className="hover:bg-muted/50/50 transition-colors">
                          <td className="px-6 py-4 font-bold text-slate-700">
                            {result.parameterName}
                          </td>

                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <span
                                className={`font-bold px-3 py-1.5 rounded-lg text-sm border ${
                                  result.isCritical
                                    ? "bg-rose-600 text-primary-foreground border-rose-700 shadow-md shadow-rose-500/20"
                                    : result.isAbnormal
                                      ? "bg-rose-50 text-rose-700 border-rose-200"
                                      : result.value
                                        ? "bg-card text-foreground border-border shadow-sm"
                                        : "bg-muted/30 text-muted-foreground/70 font-normal italic border-dashed border-slate-300"
                                }`}>
                                {result.value || "Pending Entry..."}
                              </span>
                              {result.isAbnormal && !result.isCritical && (
                                <ShieldAlert className="w-5 h-5 text-rose-500" />
                              )}
                            </div>
                          </td>

                          <td className="px-6 py-4 text-muted-foreground font-medium">
                            {result.unit || "-"}
                          </td>
                          <td className="px-6 py-4 text-muted-foreground font-medium whitespace-pre-wrap leading-relaxed">
                            {result.refRangeText || "-"}
                          </td>

                          <td className="px-6 py-4 text-right">
                            {result.entryMethod === "MACHINE_INTERFACE" ? (
                              <div className="inline-flex flex-col items-end">
                                <span className="inline-flex items-center gap-1.5 text-[9px] font-bold text-primary bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200 uppercase tracking-widest shadow-sm">
                                  <Server className="w-3 h-3" /> Auto Sync
                                </span>
                                {result.analyzer && (
                                  <span
                                    className="text-[10px] text-muted-foreground/70 mt-1.5 font-mono font-bold truncate max-w-[120px]"
                                    title={result.analyzer.name}>
                                    {result.analyzer.name}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-[10px] font-bold text-muted-foreground bg-muted border border-border px-2 py-1 rounded-md uppercase tracking-wider">
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
                            className="px-6 py-16 text-center text-muted-foreground">
                            <p className="font-bold text-muted-foreground mb-2">
                              No parameters found.
                            </p>
                            <Link
                              href={`/workspace/workflow/results/${sample.patientId}`}
                              className="text-primary font-bold hover:underline text-sm inline-flex items-center gap-1">
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
      </main>

      {/* 3. FLOATING ACTION FOOTER (Only shows if NOT approved) */}
      {!isFullyApproved && (
        <div className="fixed bottom-0 left-0 right-0 bg-card/80 backdrop-blur-xl border-t border-slate-200/60 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] p-4 md:p-6 z-50 animate-in slide-in-from-bottom-10 duration-300">
          <div className="max-w-[1200px] mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="bg-indigo-100 text-primary p-3 rounded-xl hidden sm:flex shrink-0 shadow-inner border border-indigo-200">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="text-center sm:text-left">
                <p className="font-black text-foreground text-sm md:text-base">
                  Ready to finalize this report?
                </p>
                <p className="text-xs font-medium text-muted-foreground mt-0.5">
                  Verify machine integrations and manual entries. Approval locks
                  the results.
                </p>
              </div>
            </div>

            <form action={approveAllResults} className="w-full sm:w-auto">
              <button
                type="submit"
                className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-primary-foreground font-bold rounded-xl shadow-md shadow-emerald-500/25 transition-all hover:-translate-y-0.5 text-sm flex items-center justify-center gap-2">
                <ShieldAlert className="w-5 h-5" />
                Verify & Approve All Tests
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
