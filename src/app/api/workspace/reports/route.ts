import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDataFromToken } from "@/lib/auth";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getDataFromToken(req);
    if (!user || !user.labId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const filter = searchParams.get("filter") || "all"; // all | print_ready | draft | sent

    // Build status filter
    let statusFilter: any = {};
    if (filter === "print_ready") {
      // Print-ready = APPROVED or FINAL (signed off by pathologist, ready to dispatch)
      statusFilter = { in: ["APPROVED", "FINAL"] };
    } else if (filter === "draft") {
      statusFilter = { in: ["DRAFT", "GENERATED"] };
    } else if (filter === "sent") {
      statusFilter = "SENT_TO_PATIENT";
    }

    const where: any = { labId: user.labId };
    if (filter !== "all") where.status = statusFilter;

    const reports = await prisma.report.findMany({
      where,
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            patientId: true,
          },
        },
        test: {
          select: {
            id: true,
            testName: true,
            testCode: true,
            invoice: { select: { id: true, invoiceNumber: true } },
          },
        },
      },
      orderBy: {
        createdAt: 'desc'
      },
    });

    return NextResponse.json({ reports }, { status: 200 });
  } catch (error) {
    console.error("Fetch Reports Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
