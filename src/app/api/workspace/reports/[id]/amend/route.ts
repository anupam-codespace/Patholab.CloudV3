import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDataFromToken } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getDataFromToken(req);
    if (!user || !user.labId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const currentUserId = user.id || user.userId;
    if (!currentUserId) return NextResponse.json({ error: "User ID missing from authentication token" }, { status: 401 });

    const reportId = params.id;
    const { reason } = await req.json();

    if (!reason || reason.length < 5) {
      return NextResponse.json({ error: "A valid reason is required for medical amendments." }, { status: 400 });
    }

    const existingReport = await prisma.report.findUnique({
      where: { id: reportId }
    });

    if (!existingReport) return NextResponse.json({ error: "Report not found" }, { status: 404 });
    if (existingReport.labId !== user.labId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const updatedReport = await prisma.$transaction(async (tx) => {
      
      const amended = await tx.report.update({
        where: { id: reportId },
        data: {
          status: 'AMENDED',
          version: { increment: 1 }, 
          isAmended: true,
          amendmentReason: reason,
          previousPdfUrl: existingReport.pdfUrl, 
          pdfUrl: null, 
          isSigned: false, 
          signedById: null,
          signedAt: null,
        }
      });

      // 👇 THE MISSING LINK: Unlock the underlying Test! 👇
      if (existingReport.testId) {
        await tx.test.update({
          where: { id: existingReport.testId },
          data: {
            status: 'IN_PROGRESS', // This pushes it BACK to the Worklist
            approvedAt: null,      // Remove previous approval
            approvedBy: null,
          }
        });
      }

      await tx.auditLog.create({
        data: {
          labId: user.labId,
          userId: currentUserId, 
          entity: "REPORT",
          entityId: reportId,
          action: "AMEND",
          oldData: { version: existingReport.version, status: existingReport.status },
          newData: { version: amended.version, reason: reason },
        }
      });

      return amended;
    });

    return NextResponse.json({ success: true, report: updatedReport }, { status: 200 });
  } catch (error) {
    console.error("Amend Report Error:", error);
    return NextResponse.json({ error: "Failed to amend report" }, { status: 500 });
  }
}