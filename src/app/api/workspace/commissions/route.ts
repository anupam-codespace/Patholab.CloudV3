import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDataFromToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

async function getAuthenticatedLabId(req: NextRequest): Promise<string | null> {
  const user = await getDataFromToken(req);
  if (!user) return null;
  const userId = user.userId || user.id;
  if (user.labId) return user.labId;

  if (userId) {
    const ownerLab = await prisma.lab.findFirst({
      where: { ownerId: userId },
      select: { id: true },
    });
    if (ownerLab) return ownerLab.id;

    const staffLab = await prisma.labStaff.findFirst({
      where: { userId, isActive: true },
      select: { labId: true },
    });
    if (staffLab) return staffLab.labId;

    if (user.role === "SUPER_ADMIN") {
      const firstLab = await prisma.lab.findFirst({
        where: { isActive: true },
        select: { id: true },
      });
      if (firstLab) return firstLab.id;
    }
  }

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// GET: Comprehensive Commissions Dashboard Data + Top Referrers + Splits
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const labId = await getAuthenticatedLabId(req);
    if (!labId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Fetch Doctors + Commissions
    const doctors = await prisma.doctor.findMany({
      where: { labId, deletedAt: null },
      include: {
        commissions: {
          include: {
            test: {
              select: {
                testName: true,
                testNumber: true,
                finalPrice: true,
                createdAt: true,
                patient: { select: { name: true } },
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { name: "asc" },
    });

    // 2. Fetch Agencies + Commissions
    const agencies = await prisma.agency.findMany({
      where: { labId, deletedAt: null },
      include: {
        commissions: {
          include: {
            test: {
              select: {
                testName: true,
                testNumber: true,
                finalPrice: true,
                createdAt: true,
                patient: { select: { name: true } },
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { agencyName: "asc" },
    });

    let grandTotalPaid = 0;
    let grandTotalPending = 0;
    let doctorTotalComm = 0;
    let agencyTotalComm = 0;

    const processPartner = (entity: any, isAgency: boolean) => {
      let totalPending = 0;
      let totalPaid = 0;
      let pendingCount = 0;

      entity.commissions.forEach((c: any) => {
        const amt = Number(c.amount) || 0;
        if (c.status === "PENDING") {
          totalPending += amt;
          pendingCount++;
        } else if (c.status === "PAID") {
          totalPaid += amt;
        }
      });

      const total = totalPending + totalPaid;
      grandTotalPaid += totalPaid;
      grandTotalPending += totalPending;

      if (isAgency) {
        agencyTotalComm += total;
      } else {
        doctorTotalComm += total;
      }

      const commRule = entity.commissionRate
        ? `${entity.commissionRate}${entity.commissionType === "PERCENTAGE" ? "%" : " Flat"}`
        : "Standard";

      return {
        id: entity.id,
        name: isAgency ? entity.agencyName : entity.name,
        contact: isAgency ? entity.contactPerson || entity.phone || "" : entity.phone || "",
        type: isAgency ? "AGENCY" : "DOCTOR",
        tier: isAgency ? entity.agencyTier || "STANDARD" : undefined,
        specialization: !isAgency ? entity.specialization || "General Practice" : undefined,
        commissionRule: commRule,
        totalCommission: total,
        totalPending,
        totalPaid,
        pendingCount,
        recentCommissions: entity.commissions.map((c: any) => ({
          id: c.id,
          amount: Number(c.amount),
          rate: Number(c.rate),
          type: c.type,
          status: c.status,
          paidAt: c.paidAt,
          transactionRef: c.transactionRef,
          createdAt: c.createdAt,
          testName: c.test?.testName || "Investigation",
          testNumber: c.test?.testNumber || "",
          testPrice: c.test?.finalPrice ? Number(c.test.finalPrice) : 0,
          patientName: c.test?.patient?.name || "Patient",
        })),
      };
    };

    const formattedDoctors = doctors.map((d) => processPartner(d, false));
    const formattedAgencies = agencies.map((a) => processPartner(a, true));

    const grandTotalGenerated = grandTotalPaid + grandTotalPending;

    // Active Partners count (partners with at least 1 commission or test referral)
    const activePartnersCount =
      formattedDoctors.filter((d) => d.totalCommission > 0).length +
      formattedAgencies.filter((a) => a.totalCommission > 0).length;

    // Top 5 Referrers across both doctors and agencies
    const allPartners = [...formattedDoctors, ...formattedAgencies];
    const topReferrers = allPartners
      .sort((a, b) => b.totalCommission - a.totalCommission)
      .slice(0, 5)
      .map((p) => ({
        id: p.id,
        name: p.name,
        type: p.type,
        totalCommission: p.totalCommission,
        totalPaid: p.totalPaid,
        totalPending: p.totalPending,
        sharePercentage:
          grandTotalGenerated > 0
            ? Math.round((p.totalCommission / grandTotalGenerated) * 100)
            : 0,
      }));

    // Revenue Split (Doctor vs Agency commissions)
    const totalSplitComm = doctorTotalComm + agencyTotalComm;
    const doctorPercentage =
      totalSplitComm > 0 ? Math.round((doctorTotalComm / totalSplitComm) * 100) : 50;
    const agencyPercentage = totalSplitComm > 0 ? 100 - doctorPercentage : 50;

    return NextResponse.json({
      success: true,
      kpis: {
        totalGenerated: grandTotalGenerated,
        totalPaid: grandTotalPaid,
        totalPending: grandTotalPending,
        activePartners: activePartnersCount || allPartners.length,
      },
      topReferrers,
      revenueSplit: {
        doctorPercentage,
        agencyPercentage,
        doctorTotal: doctorTotalComm,
        agencyTotal: agencyTotalComm,
      },
      doctors: formattedDoctors,
      agencies: formattedAgencies,
    });
  } catch (error: any) {
    console.error("GET /api/workspace/commissions Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch commissions" },
      { status: 500 }
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST: Settle Commission Records (Mark as PAID)
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const labId = await getAuthenticatedLabId(req);
    if (!labId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { commissionIds, transactionRef } = body;

    if (!Array.isArray(commissionIds) || commissionIds.length === 0) {
      return NextResponse.json(
        { error: "No commission IDs provided for settlement" },
        { status: 400 }
      );
    }

    const res = await prisma.commission.updateMany({
      where: {
        id: { in: commissionIds },
        status: "PENDING",
        test: { labId },
      },
      data: {
        status: "PAID",
        paidAt: new Date(),
        transactionRef: transactionRef ? transactionRef.trim() : "Cash Settlement",
      },
    });

    return NextResponse.json({
      success: true,
      settledCount: res.count,
      message: `${res.count} commissions marked as PAID successfully`,
    });
  } catch (error: any) {
    console.error("POST /api/workspace/commissions Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to settle commissions" },
      { status: 500 }
    );
  }
}
