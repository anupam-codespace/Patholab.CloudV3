import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDataFromToken } from "@/lib/auth";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getDataFromToken(req);
    if (!user || !user.labId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const labId = user.labId;

    // 1. Auto-synchronize: Ensure every test in this lab has an associated Report record
    try {
      const unlinkedTests = await prisma.test.findMany({
        where: {
          labId: labId,
          report: null,
        },
        select: {
          id: true,
          patientId: true,
          branchId: true,
          status: true,
          approvedAt: true,
          createdAt: true,
        },
        take: 100,
        orderBy: { createdAt: "desc" },
      });

      if (unlinkedTests.length > 0) {
        for (const t of unlinkedTests) {
          if (t.patientId) {
            try {
              let rStatus: any = "DRAFT";
              if (t.status === "APPROVED") rStatus = "APPROVED";
              else if (t.status === "COMPLETED") rStatus = "GENERATED";
              else if (t.status === "DELIVERED") rStatus = "SENT_TO_PATIENT";

              await prisma.report.create({
                data: {
                  labId: labId,
                  branchId: t.branchId,
                  testId: t.id,
                  patientId: t.patientId,
                  status: rStatus,
                  approvedAt: t.approvedAt,
                  version: 1,
                  createdAt: t.createdAt || new Date(),
                },
              });
            } catch {
              // Ignore single conflict errors
            }
          }
        }
      }
    } catch (syncErr) {
      console.warn("Auto-sync unlinked tests warning:", syncErr);
    }

    // 2. Query all reports for this lab with complete patient, test, category, and pathologist details
    const reports = await prisma.report.findMany({
      where: {
        labId: labId,
      },
      include: {
        patient: {
          select: {
            id: true,
            patientId: true,
            name: true,
            phone: true,
            email: true,
            age: true,
            ageUnit: true,
            gender: true,
          },
        },
        test: {
          select: {
            id: true,
            testName: true,
            testCode: true,
            testNumber: true,
            status: true,
            priority: true,
            price: true,
            finalPrice: true,
            category: {
              select: {
                id: true,
                name: true,
              },
            },
            sample: {
              select: {
                id: true,
                barcode: true,
              },
            },
            doctor: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        pathologist: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 200,
    });

    return NextResponse.json({ reports }, { status: 200 });
  } catch (error) {
    console.error("Fetch Reports Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}