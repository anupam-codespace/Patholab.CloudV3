import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDataFromToken } from "@/lib/auth"; // Adjust based on your auth path

export async function GET(req: NextRequest) {
  try {
    const user = await getDataFromToken(req);
    if (!user || !user.labId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch studies that actually have reports written for them
    const studies = await prisma.radiologyStudy.findMany({
      where: {
        labId: user.labId,
        report: { isNot: null }, // Only fetch if a report exists
      },
      include: {
        patient: {
          select: { name: true, phone: true, email: true },
        },
        report: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // Map Prisma models to the Report interface expected by your UI
    const formattedReports = studies.map((study) => ({
      id: study.id, // Using Study ID as the primary identifier for sharing/downloading
      version: 1, // Fallback: We will add this to schema later
      status: study.report?.status || study.status, // Use report status or fallback to study status
      pdfUrl: null,
      isAmended: !!study.report?.addendum, // Fallback: Treat presence of an addendum as "Amended" for now
      amendmentReason: study.report?.addendum || null, 
      createdAt: study.report?.createdAt.toISOString(),
      patient: {
        name: study.patient.name,
        phone: study.patient.phone || "",
        email: study.patient.email || null,
      },
    }));

    return NextResponse.json({ success: true, reports: formattedReports });
  } catch (error) {
    console.error("Reports Fetch Error:", error);
    return NextResponse.json({ error: "Failed to fetch reports" }, { status: 500 });
  }
}