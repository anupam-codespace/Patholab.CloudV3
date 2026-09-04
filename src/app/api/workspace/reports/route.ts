import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDataFromToken, getCurrentUser } from "@/lib/auth";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const userFromToken = await getDataFromToken(req);
    const currentUser = await getCurrentUser();
    const user = userFromToken || currentUser;

    let labId = user?.labId;
    if (!labId && user) {
      const uid = user.userId || user.id;
      if (uid) {
        const dbUser = await prisma.user.findUnique({
          where: { id: uid },
          include: {
            lab: true,
            staffLabs: { include: { lab: true } },
          },
        });
        const activeLab = dbUser?.lab || dbUser?.staffLabs?.[0]?.lab;
        if (activeLab) labId = activeLab.id;
      }
    }

    if (!user || !labId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // 1. Fetch official Report records
    const reports = await prisma.report.findMany({
      where: {
        labId
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
          }
        },
        test: {
          select: {
            id: true,
            testName: true,
            testCode: true,
            testNumber: true,
            status: true,
            department: {
              select: { name: true }
            }
          }
        },
        pathologist: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 100
    });

    // 2. Fetch recent completed/accessioned tests that do not have a separate report row yet
    const existingTestIds = new Set(reports.map(r => r.testId).filter(Boolean));
    const nonReportedTests = await prisma.test.findMany({
      where: {
        labId,
        id: { notIn: Array.from(existingTestIds) as string[] }
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
          }
        },
        department: {
          select: { name: true }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 50
    });

    const safeReports = reports.map((r) => {
      const pUhid = r.patient?.patientId || (r.patient?.id ? `P-${r.patient.id.substring(0, 5).toUpperCase()}` : 'P-00001');
      return {
        ...r,
        patient: {
          ...r.patient,
          patientId: pUhid,
          uhid: pUhid,
          age: r.patient?.age ? `${r.patient.age} ${r.patient.ageUnit || 'Yrs'}` : '—',
          gender: r.patient?.gender || '—',
        },
        test: r.test ? {
          ...r.test,
          name: r.test.testName,
          testName: r.test.testName,
          testCode: r.test.testCode,
          department: r.test.department || { name: "Pathology" }
        } : {
          name: "Diagnostic Investigation",
          testName: "Diagnostic Investigation",
          testCode: "TEST",
          department: { name: "Pathology" }
        }
      };
    });

    const fallbackReports = nonReportedTests.map((t) => {
      const pUhid = t.patient?.patientId || (t.patient?.id ? `P-${t.patient.id.substring(0, 5).toUpperCase()}` : 'P-00001');
      return {
        id: t.id,
        version: 1,
        status: t.status === 'COMPLETED' ? 'APPROVED' : (t.status || 'APPROVED'),
        pdfUrl: null,
        isAmended: false,
        amendmentReason: null,
        createdAt: t.createdAt,
        patient: {
          ...t.patient,
          patientId: pUhid,
          uhid: pUhid,
          age: t.patient?.age ? `${t.patient.age} ${t.patient.ageUnit || 'Yrs'}` : '—',
          gender: t.patient?.gender || '—',
        },
        test: {
          id: t.id,
          name: t.testName,
          testName: t.testName,
          testCode: t.testCode,
          testNumber: t.testNumber,
          department: t.department || { name: "Pathology" }
        },
        pathologist: {
          name: user.name || "Chief Pathologist"
        }
      };
    });

    const combined = [...safeReports, ...fallbackReports];
    return NextResponse.json({ reports: combined }, { status: 200 });
  } catch (error) {
    console.error("Fetch Reports Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}