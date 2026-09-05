import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDataFromToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getDataFromToken(req);
    if (!user || !user.labId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const reportId = params.id;
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const existingReport = await prisma.report.findUnique({
      where: { id: reportId },
    });

    if (!existingReport || existingReport.labId !== user.labId) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    const updated = await prisma.report.update({
      where: { id: reportId },
      data: {
        status: "SENT_TO_PATIENT",
      },
    });

    return NextResponse.json({ success: true, report: updated });
  } catch (error) {
    console.error("Dispatch Report Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
