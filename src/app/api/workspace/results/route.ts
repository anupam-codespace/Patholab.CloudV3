import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    // 1. Secure Authentication & Multi-Tenancy
    const user = await getCurrentUser();
    if (!user || !user.labId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Parse Requested Tab Status from Frontend
    const searchParams = req.nextUrl.searchParams;
    const tabStatus = searchParams.get("status") || "PENDING";

    // 3. MAP FRONTEND UI TABS TO ACTUAL PRISMA ENUMS
    const statusMap: Record<string, any> = {
      "PENDING": "PENDING",           
      "DRAFT": "IN_PROGRESS",          // Mapped to your schema's TestStatus
      "NEEDS_APPROVAL": "COMPLETED",  
      "COMPLETED": "APPROVED",        
    };

    const dbStatus = statusMap[tabStatus] || "PENDING";

    // 4. Build Branch-Isolated Query
    const whereClause: any = {
      labId: user.labId,
      status: { not: "CANCELLED" },
      tests: {
        some: { status: dbStatus },
      },
    };

    // Row-Level Security
    if (user.role !== "LAB_OWNER" && user.role !== "SUPER_ADMIN" && user.branchId) {
      whereClause.branchId = user.branchId;
    }

    // 5. Fetch Deeply Nested Invoice Data
    const invoices = await prisma.invoice.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      take: 50, 
      include: {
        patient: {
          select: { name: true, age: true, gender: true, phone: true },
        },
        agency: { select: { agencyName: true } },
        tests: {
          where: { status: dbStatus },
          include: {
            // FIXED: Using exact relation name from your schema
            testTemplate: { select: { name: true } },
            results: {
              // FIXED: Sorting by 'order' as defined in your schema
              orderBy: { order: 'asc' }, 
              // FIXED: Removed 'parameter: true' because your schema intelligently snapshots data!
            },
          },
        },
      },
    });

    // 6. Shape Data Exactly for the New UI Architecture
    const worklist = invoices.map((inv: any) => {
      // Safely map B2B or B2C referrer
      const referredBy = inv.isB2B
        ? inv.agency?.agencyName || "B2B Agency"
        : inv.referredBy || "Self";

      return {
        invoiceId: inv.id,
        invoiceNumber: inv.invoiceNumber,
        createdAt: inv.createdAt,
        patient: {
          name: inv.patient?.name || "Unknown Patient",
          age: inv.patient?.age || 0,
          gender: inv.patient?.gender || "U",
          phone: inv.patient?.phone || "N/A",
        },
        referredBy,
        tests: inv.tests.map((t: any) => ({
          id: t.id,
          // FIXED: Map using testTemplate
          testName: t.testTemplate?.name || t.testName || "Unknown Test",
          status: t.status, 
          notes: t.notes || "",
          impression: t.impression || "",
          // FIXED: Mapping directly from the snapshotted fields in TestResultParameter
          results: t.results.map((r: any) => ({
            id: r.id, 
            parameterName: r.printName || r.parameterCode || "Unknown Parameter",
            unit: null, // Note: Consider adding unit snapshot to your schema later if needed
            refRangeMin: null, // Handled purely by string in your snapshotted schema
            refRangeMax: null,
            refRangeText: r.referenceRangeText || "-",
            // Map either text or numeric value based on what was saved
            value: r.textValue || (r.numericValue !== null ? String(r.numericValue) : ""), 
          })),
        })),
      };
    });

    return NextResponse.json({ worklist }, { status: 200 });
  } catch (error) {
    console.error("[WORKLIST_GET_ERROR]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}