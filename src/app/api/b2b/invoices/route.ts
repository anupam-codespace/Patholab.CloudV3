import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDataFromToken } from "@/lib/auth";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getDataFromToken(req);
    if (!user || user.role !== 'B2B_PARTNER') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const agency = await prisma.agency.findFirst({ where: { userId: user.userId } });
    if (!agency) return NextResponse.json({ error: "No agency linked" }, { status: 404 });

    // Fetch B2B invoices for this agency
    const invoices = await prisma.invoice.findMany({
      where: { agencyId: agency.id, isB2B: true },
      include: {
        items: true,
        patient: { select: { name: true, patientId: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ invoices });
  } catch (error) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
