import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDataFromToken } from "@/lib/auth";

export const dynamic = 'force-dynamic';

/**
 * GET /api/b2b/dashboard
 * B2B Partner dashboard — shows stats for their agency.
 * The user must be a B2B_PARTNER linked to an Agency.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getDataFromToken(req);
    if (!user || user.role !== 'B2B_PARTNER') {
      return NextResponse.json({ error: "Unauthorized — B2B partner only" }, { status: 403 });
    }

    // Find the agency linked to this user
    const agency = await prisma.agency.findFirst({
      where: { userId: user.userId },
    });

    if (!agency) {
      return NextResponse.json({ error: "No agency linked to your account" }, { status: 404 });
    }

    // Fetch all tests referred by this agency
    const tests = await prisma.test.findMany({
      where: { agencyId: agency.id },
      include: {
        patient: { select: { name: true, age: true, gender: true, phone: true, patientId: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const totalReferrals = tests.length;
    const pendingReports = tests.filter(t => t.status === 'PENDING' || t.status === 'PROCESSING').length;
    const completedReports = tests.filter(t => t.status === 'COMPLETED' || t.status === 'APPROVED').length;

    // Fetch commissions for earnings
    const commissions = await prisma.commission.findMany({
      where: { agencyId: agency.id },
    });
    const totalEarnings = commissions.reduce((sum, c) => sum + Number(c.amount), 0);

    // Recent patients (last 10)
    const recentPatients = tests.slice(0, 10);

    return NextResponse.json({
      agency: {
        id: agency.id,
        agencyName: agency.agencyName,
        agencyTier: agency.tier || "Standard",
      },
      stats: {
        totalReferrals,
        pendingReports,
        completedReports,
        totalEarnings,
      },
      recentPatients,
    });
  } catch (error: any) {
    console.error("B2B Dashboard Error:", error);
    return NextResponse.json({ error: "Failed to load dashboard" }, { status: 500 });
  }
}
