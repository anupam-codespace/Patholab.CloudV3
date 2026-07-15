import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDataFromToken } from "@/lib/auth";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getDataFromToken(req);
    if (!user || !user.labId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    // Verify patient belongs to lab
    const patient = await prisma.patient.findFirst({ where: { id, labId: user.labId } });
    if (!patient) return NextResponse.json({ error: "Patient not found" }, { status: 404 });

    // Fetch all commissions for tests belonging to this patient
    const commissions = await prisma.commission.findMany({
      where: { test: { patientId: id } },
      include: {
        test: { select: { testName: true, testNumber: true, price: true, createdAt: true } },
        doctor: { select: { name: true } },
        agency: { select: { agencyName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Convert Decimal fields to Number
    const formatted = commissions.map(c => ({
      ...c,
      amount: Number(c.amount),
      rate: Number(c.rate),
      test: c.test ? { ...c.test, price: Number(c.test.price) } : null,
    }));

    return NextResponse.json({ commissions: formatted });
  } catch (error) {
    console.error("GET patient commissions error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
