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

    const testId = params.id;
    const { results } = await req.json();

    // 1. Transaction with EXTENDED TIMEOUT ⏳
    await prisma.$transaction(async (tx) => {
      
      // 2. Process and Save each Parameter
      for (const [paramId, value] of Object.entries(results)) {
        const valString = value as string;
        const numericVal = parseFloat(valString);
        let flag = "NORMAL";
        let isAbnormal = false;

        const param = await tx.testResultParameter.findUnique({ where: { id: paramId } });
        
        if (param && !isNaN(numericVal)) {
          if (param.refRangeMin !== null && numericVal < param.refRangeMin) {
            flag = "LOW";
            isAbnormal = true;
          } else if (param.refRangeMax !== null && numericVal > param.refRangeMax) {
            flag = "HIGH";
            isAbnormal = true;
          }
        }

        await tx.testResultParameter.update({
          where: { id: paramId },
          data: {
            value: valString,
            numericValue: isNaN(numericVal) ? null : numericVal,
            flag: flag as any,
            isAbnormal: isAbnormal
          }
        });
      }

      // 3. Update Test Status (Add 'include' to fetch patient name)
      const updatedTest = await tx.test.update({
        where: { id: testId },
        data: {
          status: 'APPROVED',
          approvedAt: new Date(),
          approvedBy: user.name || "System User", 
        },
        include: { patient: { select: { name: true } } } // We need the name for the URL!
      });
        

    // 4. Generate OR Update the Report Record (FIX FOR UNIQUE CONSTRAINT)
      const existingReport = await tx.report.findUnique({
        where: { testId: testId }
      });

      // --- SETUP THE PROFESSIONAL URL ONCE ---
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || req.headers.get("origin") || "http://localhost:3000";
      const safeName = updatedTest.patient.name.replace(/[^a-zA-Z0-9]/g, '_');
      const filename = `${safeName}_Lab_Report.pdf`;

      if (existingReport) {
        // SCENARIO A: Re-approving an amended report!
        const publicPdfUrl = `${baseUrl}/shared/reports/${existingReport.id}/${filename}`;
        
        await tx.report.update({
          where: { id: existingReport.id },
          data: {
            status: 'GENERATED', // Mark it ready for download again
            technicianId: currentUserId,
            pdfUrl: publicPdfUrl // 👈 WE MUST RESTORE THE URL HERE!
          }
        });
      } else {
        // SCENARIO B: First-time approval! Create the report.
        const newReport = await tx.report.create({
          data: {
            labId: user.labId,
            patientId: updatedTest.patientId,
            testId: testId, 
            technicianId: currentUserId,
            status: 'GENERATED',
            version: 1,
          }
        });

        const publicPdfUrl = `${baseUrl}/shared/reports/${newReport.id}/${filename}`;

        await tx.report.update({
          where: { id: newReport.id },
          data: { pdfUrl: publicPdfUrl }
        });
      }

      

      // 5. Medical Audit Trail
      await tx.auditLog.create({
        data: {
          labId: user.labId,
          userId: currentUserId, 
          entity: "TEST_APPROVAL",
          entityId: testId,
          action: "APPROVE_AND_GENERATE_REPORT",
          newData: { results },
        }
      });

    }, { 
      // Prevents Prisma from timing out on large test profiles
      maxWait: 5000, 
      timeout: 20000 
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Approve Results Error:", error);
    return NextResponse.json({ error: "Failed to approve results" }, { status: 500 });
  }
}