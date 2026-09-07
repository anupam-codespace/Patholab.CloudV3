import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDataFromToken, hashPassword } from "@/lib/auth";
import { CommissionType } from "@prisma/client";

export const dynamic = "force-dynamic";

async function getAuthenticatedLabId(req: NextRequest): Promise<string | null> {
  const user = await getDataFromToken(req);
  if (!user) return null;
  const userId = user.userId || user.id;
  if (user.labId) return user.labId;

  if (userId) {
    const lab = await prisma.lab.findFirst({
      where: { ownerId: userId },
      select: { id: true },
    });
    if (lab) return lab.id;

    const staff = await prisma.labStaff.findFirst({
      where: { userId, isActive: true },
      select: { labId: true },
    });
    if (staff) return staff.labId;

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
// GET: Fetch All Agencies + Financial KPIs + Ledger
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const labId = await getAuthenticatedLabId(req);
    if (!labId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const dateFrom = url.searchParams.get("from");
    const dateTo = url.searchParams.get("to");

    let commissionDateFilter: any = undefined;
    if (dateFrom || dateTo) {
      commissionDateFilter = {};
      if (dateFrom) {
        commissionDateFilter.gte = new Date(dateFrom);
      }
      if (dateTo) {
        const endD = new Date(dateTo);
        endD.setHours(23, 59, 59, 999);
        commissionDateFilter.lte = endD;
      }
    }

    const [agencies, catalogTests] = await Promise.all([
      prisma.agency.findMany({
        where: { labId, deletedAt: null },
        orderBy: { createdAt: "desc" },
        include: {
          _count: {
            select: { tests: true, patients: true },
          },
          user: {
            select: { id: true, email: true, isActive: true },
          },
          customTestCommissions: {
            include: {
              testTemplate: { select: { id: true, name: true, price: true } },
            },
          },
          commissions: {
            where: commissionDateFilter ? { createdAt: commissionDateFilter } : undefined,
            include: {
              test: {
                select: {
                  testName: true,
                  testNumber: true,
                  createdAt: true,
                  finalPrice: true,
                  patient: { select: { name: true } },
                },
              },
            },
            orderBy: { createdAt: "desc" },
          },
        },
      }),
      prisma.testTemplate.findMany({
        where: {
          deletedAt: null,
          OR: [{ labId }, { isGlobal: true }],
        },
        select: { id: true, name: true, price: true },
        orderBy: { name: "asc" },
      }),
    ]);

    let totalLifetimeCommissions = 0;
    let totalPendingCommissions = 0;
    let totalPaidCommissions = 0;
    let totalReferralsCount = 0;

    const formatted = agencies.map((a) => {
      let agencyPending = 0;
      let agencyPaid = 0;

      a.commissions.forEach((c) => {
        const amt = Number(c.amount) || 0;
        if (c.status === "PENDING") {
          agencyPending += amt;
        } else if (c.status === "PAID") {
          agencyPaid += amt;
        }
      });

      const agencyTotalComm = agencyPending + agencyPaid;
      totalLifetimeCommissions += agencyTotalComm;
      totalPendingCommissions += agencyPending;
      totalPaidCommissions += agencyPaid;
      totalReferralsCount += a._count.tests;

      return {
        id: a.id,
        agencyName: a.agencyName,
        contactPerson: a.contactPerson || "",
        email: a.email || "",
        phone: a.phone || "",
        panNumber: a.panNumber || "",
        agencyTier: a.agencyTier || "STANDARD",
        monthlyVolume: a.monthlyVolume || 0,
        commissionRate: a.commissionRate ? Number(a.commissionRate) : 0,
        commissionType: a.commissionType,
        totalReferrals: a._count.tests,
        totalPatients: a._count.patients,
        totalCommission: agencyTotalComm,
        pendingCommission: agencyPending,
        paidCommission: agencyPaid,
        isActive: a.isActive,
        createdAt: a.createdAt,
        hasLogin: !!a.userId,
        loginEmail: a.user?.email || null,
        customTestCommissions: a.customTestCommissions.map((cc) => ({
          testTemplateId: cc.testTemplateId,
          testName: cc.testTemplate?.name || "Unknown Test",
          basePrice: cc.testTemplate?.price ? Number(cc.testTemplate.price) : 0,
          commissionRate: cc.commissionRate ?? null,
          commissionType: cc.commissionType,
          netPrice: cc.netPrice ? Number(cc.netPrice) : null,
        })),
        commissions: a.commissions.map((c) => ({
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
          patientName: c.test?.patient?.name || "Walk-in Patient",
        })),
      };
    });

    const kpis = {
      totalAgencies: agencies.length,
      activeAgencies: agencies.filter((a) => a.isActive).length,
      totalReferrals: totalReferralsCount,
      totalCommission: totalLifetimeCommissions,
      pendingCommission: totalPendingCommissions,
      paidCommission: totalPaidCommissions,
    };

    return NextResponse.json({
      success: true,
      agencies: formatted,
      kpis,
      catalog: catalogTests.map((t) => ({
        id: t.id,
        name: t.name,
        price: Number(t.price) || 0,
      })),
    });
  } catch (error: any) {
    console.error("GET /api/workspace/b2b/agencies Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch agencies" },
      { status: 500 }
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST: Create Agency + Custom Rates + Optional Portal Login
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const labId = await getAuthenticatedLabId(req);
    if (!labId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      agencyName,
      contactPerson,
      phone,
      email,
      panNumber,
      agencyTier,
      commissionRate,
      commissionType,
      customCommissions,
      createLogin,
      loginEmail,
      loginPassword,
    } = body;

    if (!agencyName || typeof agencyName !== "string" || !agencyName.trim()) {
      return NextResponse.json(
        { error: "Agency name is required" },
        { status: 400 }
      );
    }

    let createdUserId: string | null = null;

    // Optional: Create Portal User Login Account
    if (createLogin && loginEmail && loginPassword) {
      const cleanEmail = loginEmail.trim().toLowerCase();
      const existingUser = await prisma.user.findUnique({
        where: { email: cleanEmail },
      });

      if (existingUser) {
        return NextResponse.json(
          { error: "A user with this login email already exists." },
          { status: 400 }
        );
      }

      const hashedPassword = await hashPassword(loginPassword);
      const newUser = await prisma.user.create({
        data: {
          name: agencyName.trim(),
          email: cleanEmail,
          password: hashedPassword,
          role: "AGENCY" as any,
          isActive: true,
        },
      });
      createdUserId = newUser.id;
    }

    const commType: CommissionType =
      commissionType === "FIXED"
        ? "FIXED"
        : commissionType === "NET_PRICE"
        ? "NET_PRICE"
        : "PERCENTAGE";

    const agency = await prisma.agency.create({
      data: {
        labId,
        agencyName: agencyName.trim(),
        contactPerson: contactPerson ? contactPerson.trim() : null,
        phone: phone ? phone.trim() : null,
        email: email ? email.trim().toLowerCase() : null,
        panNumber: panNumber ? panNumber.trim().toUpperCase() : null,
        agencyTier: agencyTier || "STANDARD",
        commissionRate: commissionRate !== undefined && commissionRate !== null ? Number(commissionRate) : null,
        commissionType: commType,
        userId: createdUserId,
        customTestCommissions: {
          create: Array.isArray(customCommissions)
            ? customCommissions.map((c: any) => ({
                testTemplateId: c.testTemplateId,
                commissionRate:
                  c.commissionRate !== undefined && c.commissionRate !== null
                    ? Number(c.commissionRate)
                    : null,
                commissionType:
                  c.commissionType === "FIXED"
                    ? ("FIXED" as CommissionType)
                    : c.commissionType === "NET_PRICE"
                    ? ("NET_PRICE" as CommissionType)
                    : ("PERCENTAGE" as CommissionType),
                netPrice:
                  c.netPrice !== undefined && c.netPrice !== null
                    ? Number(c.netPrice)
                    : null,
              }))
            : [],
        },
      },
      include: {
        customTestCommissions: true,
      },
    });

    return NextResponse.json({
      success: true,
      agency,
      message: "Agency created successfully",
    });
  } catch (error: any) {
    console.error("POST /api/workspace/b2b/agencies Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create agency" },
      { status: 500 }
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PATCH: Update Agency Profile, Commission Rules & Custom Rates
// ─────────────────────────────────────────────────────────────────────────────
export async function PATCH(req: NextRequest) {
  try {
    const labId = await getAuthenticatedLabId(req);
    if (!labId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      id,
      agencyName,
      contactPerson,
      phone,
      email,
      panNumber,
      agencyTier,
      commissionRate,
      commissionType,
      customCommissions,
      isActive,
      resetPassword,
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Agency ID is required" },
        { status: 400 }
      );
    }

    const existing = await prisma.agency.findFirst({
      where: { id, labId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Agency not found" },
        { status: 404 }
      );
    }

    // Optional: Reset Portal User Password
    if (resetPassword && existing.userId) {
      const hashedPassword = await hashPassword(resetPassword);
      await prisma.user.update({
        where: { id: existing.userId },
        data: { password: hashedPassword },
      });
    }

    const commType: CommissionType =
      commissionType === "FIXED"
        ? "FIXED"
        : commissionType === "NET_PRICE"
        ? "NET_PRICE"
        : "PERCENTAGE";

    // Delete existing custom test commissions and re-insert
    if (Array.isArray(customCommissions)) {
      await prisma.agencyCustomCommission.deleteMany({
        where: { agencyId: id },
      });

      if (customCommissions.length > 0) {
        await prisma.agencyCustomCommission.createMany({
          data: customCommissions.map((c: any) => ({
            agencyId: id,
            testTemplateId: c.testTemplateId,
            commissionRate:
              c.commissionRate !== undefined && c.commissionRate !== null
                ? Number(c.commissionRate)
                : null,
            commissionType:
              c.commissionType === "FIXED"
                ? ("FIXED" as CommissionType)
                : c.commissionType === "NET_PRICE"
                ? ("NET_PRICE" as CommissionType)
                : ("PERCENTAGE" as CommissionType),
            netPrice:
              c.netPrice !== undefined && c.netPrice !== null
                ? Number(c.netPrice)
                : null,
          })),
        });
      }
    }

    const updated = await prisma.agency.update({
      where: { id },
      data: {
        agencyName: agencyName !== undefined ? agencyName.trim() : undefined,
        contactPerson:
          contactPerson !== undefined ? contactPerson.trim() : undefined,
        phone: phone !== undefined ? phone.trim() : undefined,
        email: email !== undefined ? email.trim().toLowerCase() : undefined,
        panNumber:
          panNumber !== undefined ? panNumber.trim().toUpperCase() : undefined,
        agencyTier: agencyTier !== undefined ? agencyTier : undefined,
        commissionRate:
          commissionRate !== undefined && commissionRate !== null
            ? Number(commissionRate)
            : undefined,
        commissionType: commissionType ? commType : undefined,
        isActive: isActive !== undefined ? !!isActive : undefined,
      },
    });

    return NextResponse.json({
      success: true,
      agency: updated,
      message: "Agency updated successfully",
    });
  } catch (error: any) {
    console.error("PATCH /api/workspace/b2b/agencies Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update agency" },
      { status: 500 }
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE: Remove Agency Safely
// ─────────────────────────────────────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  try {
    const labId = await getAuthenticatedLabId(req);
    if (!labId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Agency ID is required" },
        { status: 400 }
      );
    }

    const existing = await prisma.agency.findFirst({
      where: { id, labId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Agency not found" },
        { status: 404 }
      );
    }

    // Soft delete or delete if no tests linked
    const testsCount = await prisma.test.count({
      where: { agencyId: id },
    });

    if (testsCount > 0) {
      await prisma.agency.update({
        where: { id },
        data: { isActive: false, deletedAt: new Date() },
      });
    } else {
      await prisma.agencyCustomCommission.deleteMany({
        where: { agencyId: id },
      });
      await prisma.agency.delete({
        where: { id },
      });
    }

    return NextResponse.json({
      success: true,
      message: "Agency deleted successfully",
    });
  } catch (error: any) {
    console.error("DELETE /api/workspace/b2b/agencies Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete agency" },
      { status: 500 }
    );
  }
}
