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

    const tests = await prisma.test.findMany({
      where: { agencyId: agency.id },
      include: {
        patient: { select: { id: true, name: true, age: true, gender: true, phone: true, patientId: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ tests });
  } catch (error) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
