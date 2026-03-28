import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { redirect } from "next/navigation";
import VisualMapper from "./VisualMapper";
import Link from "next/link";

export default async function VisualMapperPage() {
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

  return (
    <div className="max-w-6xl mx-auto p-6 bg-slate-50 min-h-screen">
      <Link
        href="/lab-owner/analyzer/mappings"
        className="text-blue-600 text-sm font-bold hover:underline mb-4 inline-block">
        &larr; Back to Dictionary
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 tracking-tight">
          Visual Mapper
        </h1>
        <p className="text-slate-500 mt-1">
          Connect incoming machine codes to your database parameters. The
          webhook feeds this list automatically.
        </p>
      </div>

      <VisualMapper
        queueData={Object.values(groupedQueue)}
        saveMappingAction={saveMappings}
      />
    </div>
  );
}
