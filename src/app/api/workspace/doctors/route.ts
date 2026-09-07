import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDataFromToken } from "@/lib/auth";
import { CommissionType } from "@prisma/client";

export const dynamic = "force-dynamic";

async function getAuthenticatedLabId(req: NextRequest): Promise<string | null> {
  const user = await getDataFromToken(req);
  if (!user) return null;
  if (user.labId) return user.labId;

  const userId = user.userId || user.id;
  if (!userId) return null;

  const lab = await prisma.lab.findFirst({
    where: { ownerId: userId },
    select: { id: true },
  });
  if (lab) return lab.id;

  const staff = await prisma.labStaff.findFirst({
    where: { userId, isActive: true },
    select: { labId: true },
  });
  return staff?.labId || null;
}

// ─────────────────────────────────────────────────────────────────────────────
// GET: Fetch All Doctors + Financial Metrics + Referral Ledger
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const labId = await getAuthenticatedLabId(req);
    if (!labId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const doctors = await prisma.doctor.findMany({
      where: { labId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { tests: true, patients: true },
        },
        customTestCommissions: {
          include: {
            testTemplate: { select: { id: true, name: true, price: true } },
          },
        },
        commissions: {
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
    });

    let totalLifetimeCommissions = 0;
    let totalPendingCommissions = 0;
    let totalPaidCommissions = 0;
    let totalReferralsCount = 0;

    const formatted = doctors.map((d) => {
      let docPending = 0;
      let docPaid = 0;

      d.commissions.forEach((c) => {
        const amt = Number(c.amount) || 0;
        if (c.status === "PENDING") {
          docPending += amt;
        } else if (c.status === "PAID") {
          docPaid += amt;
        }
      });

      const docTotalComm = docPending + docPaid;
      totalLifetimeCommissions += docTotalComm;
      totalPendingCommissions += docPending;
      totalPaidCommissions += docPaid;
      totalReferralsCount += d._count.tests;

      return {
        id: d.id,
        name: d.name,
        email: d.email || "",
        phone: d.phone || "",
        specialization: d.specialization || "General Practice",
        qualification: d.qualification || "",
        clinic: d.clinic || "",
        registrationNo: d.registrationNo || "",
        commissionRate: d.commissionRate ? Number(d.commissionRate) : 0,
        commissionType: d.commissionType,
        totalReferrals: d._count.tests,
        totalPatients: d._count.patients,
        totalCommission: docTotalComm,
        pendingCommission: docPending,
        paidCommission: docPaid,
        isActive: d.isActive,
        createdAt: d.createdAt,
        customTestCommissions: d.customTestCommissions.map((cc) => ({
          testTemplateId: cc.testTemplateId,
          testName: cc.testTemplate?.name || "Unknown Test",
          basePrice: cc.testTemplate?.price ? Number(cc.testTemplate.price) : 0,
          commissionRate: cc.commissionRate,
          commissionType: cc.commissionType,
        })),
        commissions: d.commissions.map((c) => ({
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
          patientName: c.test?.patient?.name || "Referred Patient",
        })),
      };
    });

    const kpis = {
      totalDoctors: doctors.length,
      activeDoctors: doctors.filter((d) => d.isActive).length,
      totalReferrals: totalReferralsCount,
      totalCommission: totalLifetimeCommissions,
      pendingCommission: totalPendingCommissions,
      paidCommission: totalPaidCommissions,
    };

    return NextResponse.json({
      success: true,
      doctors: formatted,
      kpis,
    });
  } catch (error: any) {
    console.error("GET /api/workspace/doctors Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch doctors" },
      { status: 500 }
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST: Create Referral Doctor + Custom Margins
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const labId = await getAuthenticatedLabId(req);
    if (!labId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      name,
      phone,
      email,
      specialization,
      clinic,
      qualification,
      registrationNo,
      commissionRate,
      commissionType,
      customCommissions,
    } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { error: "Doctor name is required" },
        { status: 400 }
      );
    }

    const commType: CommissionType =
      commissionType === "FIXED" ? "FIXED" : "PERCENTAGE";

    const doctor = await prisma.doctor.create({
      data: {
        labId,
        name: name.trim(),
        phone: phone ? phone.trim() : null,
        email: email ? email.trim().toLowerCase() : null,
        specialization: specialization ? specialization.trim() : "General Practice",
        clinic: clinic ? clinic.trim() : null,
        qualification: qualification ? qualification.trim() : null,
        registrationNo: registrationNo ? registrationNo.trim() : null,
        commissionRate: commissionRate !== undefined && commissionRate !== null ? Number(commissionRate) : null,
        commissionType: commType,
        customTestCommissions: {
          create: Array.isArray(customCommissions)
            ? customCommissions.map((c: any) => ({
                testTemplateId: c.testTemplateId,
                commissionRate: Number(c.commissionRate) || 0,
                commissionType: c.commissionType || "PERCENTAGE",
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
      doctor,
      message: "Doctor created successfully",
    });
  } catch (error: any) {
    console.error("POST /api/workspace/doctors Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create doctor" },
      { status: 500 }
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PATCH: Update Referral Doctor Profile & Rates
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
      name,
      phone,
      email,
      specialization,
      clinic,
      qualification,
      registrationNo,
      commissionRate,
      commissionType,
      customCommissions,
      isActive,
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Doctor ID is required" },
        { status: 400 }
      );
    }

    const existing = await prisma.doctor.findFirst({
      where: { id, labId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Doctor not found" },
        { status: 404 }
      );
    }

    const commType: CommissionType =
      commissionType === "FIXED" ? "FIXED" : "PERCENTAGE";

    // Delete existing custom test commissions and re-insert
    if (Array.isArray(customCommissions)) {
      await prisma.doctorCustomCommission.deleteMany({
        where: { doctorId: id },
      });

      if (customCommissions.length > 0) {
        await prisma.doctorCustomCommission.createMany({
          data: customCommissions.map((c: any) => ({
            doctorId: id,
            testTemplateId: c.testTemplateId,
            commissionRate: Number(c.commissionRate) || 0,
            commissionType: c.commissionType || "PERCENTAGE",
          })),
        });
      }
    }

    const updated = await prisma.doctor.update({
      where: { id },
      data: {
        name: name !== undefined ? name.trim() : undefined,
        phone: phone !== undefined ? phone.trim() : undefined,
        email: email !== undefined ? email.trim().toLowerCase() : undefined,
        specialization:
          specialization !== undefined ? specialization.trim() : undefined,
        clinic: clinic !== undefined ? clinic.trim() : undefined,
        qualification:
          qualification !== undefined ? qualification.trim() : undefined,
        registrationNo:
          registrationNo !== undefined ? registrationNo.trim() : undefined,
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
      doctor: updated,
      message: "Doctor updated successfully",
    });
  } catch (error: any) {
    console.error("PATCH /api/workspace/doctors Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update doctor" },
      { status: 500 }
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE: Delete Doctor Safely
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
        { error: "Doctor ID is required" },
        { status: 400 }
      );
    }

    const existing = await prisma.doctor.findFirst({
      where: { id, labId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Doctor not found" },
        { status: 404 }
      );
    }

    const testsCount = await prisma.test.count({
      where: { doctorId: id },
    });

    if (testsCount > 0) {
      await prisma.doctor.update({
        where: { id },
        data: { isActive: false, deletedAt: new Date() },
      });
    } else {
      await prisma.doctorCustomCommission.deleteMany({
        where: { doctorId: id },
      });
      await prisma.doctor.delete({
        where: { id },
      });
    }

    return NextResponse.json({
      success: true,
      message: "Doctor deleted successfully",
    });
  } catch (error: any) {
    console.error("DELETE /api/workspace/doctors Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete doctor" },
      { status: 500 }
    );
  }
}
