import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDataFromToken } from "@/lib/auth";

export const dynamic = 'force-dynamic';

/**
 * POST /api/workspace/patients/[id]/calculate-commissions
 * Body: { doctorId?, agencyId? }
 * 
 * For each test belonging to this patient that doesn't already have a commission:
 * 1. Calculate commission based on custom rates → doctor/agency defaults → lab defaults
 * 2. Create Commission record linked to the test
 * 3. Update doctor/agency referral counters
 * 4. Create hidden B2B agency invoice if agency is linked
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getDataFromToken(req);
    if (!user || !user.labId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: patientId } = await params;
    const body = await req.json();
    const { doctorId, agencyId } = body;

    // Verify patient belongs to lab
    const patient = await prisma.patient.findFirst({ where: { id: patientId, labId: user.labId } });
    if (!patient) return NextResponse.json({ error: "Patient not found" }, { status: 404 });

    // Fetch lab defaults
    const lab = await prisma.lab.findUnique({
      where: { id: user.labId },
      select: { defaultDoctorCommission: true, defaultAgencyCommission: true }
    });

    // Fetch doctor and agency data
    let doctorData: any = null;
    let agencyData: any = null;
    if (doctorId) {
      doctorData = await prisma.doctor.findFirst({ where: { id: doctorId, labId: user.labId } });
    }
    if (agencyId) {
      agencyData = await prisma.agency.findFirst({ where: { id: agencyId, labId: user.labId } });
    }

    // Fetch all tests for this patient that DON'T already have commissions
    const existingCommissionTestIds = await prisma.commission.findMany({
      where: { test: { patientId } },
      select: { testId: true },
    });
    const existingIds = new Set(existingCommissionTestIds.map(c => c.testId));

    const tests = await prisma.test.findMany({
      where: { patientId, labId: user.labId },
      include: { testTemplate: { select: { id: true } } },
    });

    const testsNeedingCommission = tests.filter(t => !existingIds.has(t.id));

    if (testsNeedingCommission.length === 0) {
      return NextResponse.json({ success: true, message: "All tests already have commissions calculated." });
    }

    // Fetch custom commissions
    const templateIds = testsNeedingCommission.map(t => t.testTemplateId).filter(Boolean) as string[];
    const [doctorCustoms, agencyCustoms] = await Promise.all([
      doctorData ? prisma.doctorCustomCommission.findMany({ where: { doctorId: doctorData.id, testTemplateId: { in: templateIds } } }) : [],
      agencyData ? prisma.agencyCustomCommission.findMany({ where: { agencyId: agencyData.id, testTemplateId: { in: templateIds } } }) : [],
    ]);
    const doctorCustomMap = new Map(doctorCustoms.map((dc: any) => [dc.testTemplateId, dc]));
    const agencyCustomMap = new Map(agencyCustoms.map((ac: any) => [ac.testTemplateId, ac]));

    let totalDoctorCommission = 0;
    let totalAgencyCommission = 0;
    const agencyInvoiceItems: any[] = [];

    for (const test of testsNeedingCommission) {
      const baseAmount = Number(test.price || 0);
      if (baseAmount <= 0) continue;

      // Doctor commission
      if (doctorData) {
        const custom = doctorCustomMap.get(test.testTemplateId);
        let commissionAmount = 0;
        let rate = 0;
        let type: 'PERCENTAGE' | 'FIXED' | 'NET_PRICE' = 'PERCENTAGE';

        if (custom) {
          rate = Number(custom.commissionRate || 0);
          if (custom.commissionType === 'FLAT') { type = 'FIXED'; commissionAmount = rate; }
          else { type = 'PERCENTAGE'; commissionAmount = (baseAmount * rate) / 100; }
        } else if (doctorData.commissionRate) {
          rate = Number(doctorData.commissionRate);
          type = doctorData.commissionType || 'PERCENTAGE';
          commissionAmount = type === 'FIXED' ? rate : (baseAmount * rate) / 100;
        } else if (lab?.defaultDoctorCommission) {
          rate = Number(lab.defaultDoctorCommission);
          commissionAmount = (baseAmount * rate) / 100;
        }

        if (commissionAmount > 0) {
          totalDoctorCommission += commissionAmount;
          await prisma.commission.create({
            data: { testId: test.id, doctorId: doctorData.id, amount: commissionAmount, type, rate, status: 'PENDING' }
          });
        }
      }

      // Agency commission + B2B invoice item
      if (agencyData) {
        const custom = agencyCustomMap.get(test.testTemplateId);
        let commissionAmount = 0;
        let rate = 0;
        let type: 'PERCENTAGE' | 'FIXED' | 'NET_PRICE' = 'PERCENTAGE';
        let agencyNetPrice = baseAmount;

        if (custom) {
          if (custom.netPrice != null) {
            type = 'NET_PRICE';
            agencyNetPrice = Number(custom.netPrice);
            commissionAmount = Math.max(0, baseAmount - agencyNetPrice);
          } else if (custom.commissionRate != null) {
            rate = Number(custom.commissionRate);
            type = custom.commissionType || 'PERCENTAGE';
            if (type === 'FIXED') { commissionAmount = rate; agencyNetPrice = baseAmount - rate; }
            else { commissionAmount = (baseAmount * rate) / 100; agencyNetPrice = baseAmount - commissionAmount; }
          }
        } else if (agencyData.commissionRate) {
          rate = Number(agencyData.commissionRate);
          type = agencyData.commissionType || 'PERCENTAGE';
          if (type === 'FIXED') { commissionAmount = rate; agencyNetPrice = baseAmount - rate; }
          else { commissionAmount = (baseAmount * rate) / 100; agencyNetPrice = baseAmount - commissionAmount; }
        } else if (lab?.defaultAgencyCommission) {
          rate = Number(lab.defaultAgencyCommission);
          commissionAmount = (baseAmount * rate) / 100;
          agencyNetPrice = baseAmount - commissionAmount;
        }

        if (commissionAmount > 0) {
          totalAgencyCommission += commissionAmount;
          await prisma.commission.create({
            data: { testId: test.id, agencyId: agencyData.id, amount: commissionAmount, type, rate, status: 'PENDING' }
          });
        }

        agencyInvoiceItems.push({
          description: test.testName,
          unitPrice: agencyNetPrice,
          quantity: 1,
          taxRate: 0,
          taxAmount: 0,
          total: agencyNetPrice,
        });
      }
    }

    // Update referral counters
    if (doctorData && totalDoctorCommission > 0) {
      await prisma.doctor.update({
        where: { id: doctorData.id },
        data: { totalReferrals: { increment: testsNeedingCommission.length }, totalCommission: { increment: totalDoctorCommission } }
      });
    }
    if (agencyData && totalAgencyCommission > 0) {
      await prisma.agency.update({
        where: { id: agencyData.id },
        data: { totalReferrals: { increment: testsNeedingCommission.length }, totalCommission: { increment: totalAgencyCommission } }
      });
    }

    // Create hidden B2B agency invoice
    if (agencyData && agencyInvoiceItems.length > 0) {
      const agencySubtotal = agencyInvoiceItems.reduce((s, i) => s + i.total, 0);
      const datePrefix = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const countToday = await prisma.invoice.count({ where: { labId: user.labId, isB2B: true } });
      const agencyInvoiceNumber = `B2B-${datePrefix}-${(countToday + 1).toString().padStart(4, '0')}`;

      await prisma.invoice.create({
        data: {
          labId: user.labId,
          patientId,
          agencyId: agencyData.id,
          invoiceNumber: agencyInvoiceNumber,
          subtotal: agencySubtotal,
          discount: 0,
          taxableAmount: agencySubtotal,
          totalTax: 0, cgstAmount: 0, sgstAmount: 0, igstAmount: 0, roundOff: 0,
          grandTotal: agencySubtotal,
          status: 'PENDING',
          paymentStatus: 'PENDING',
          isB2B: true,
          items: { create: agencyInvoiceItems }
        }
      });
    }

    // Also link the patient to the doctor/agency
    if (doctorId || agencyId) {
      await prisma.patient.update({
        where: { id: patientId },
        data: {
          ...(doctorId ? { doctorId } : {}),
          ...(agencyId ? { agencyId } : {}),
        }
      });
    }

    return NextResponse.json({
      success: true,
      message: `Commissions calculated for ${testsNeedingCommission.length} tests. Doctor: ₹${totalDoctorCommission.toFixed(2)}, Agency: ₹${totalAgencyCommission.toFixed(2)}`,
      totalDoctorCommission,
      totalAgencyCommission,
      testsProcessed: testsNeedingCommission.length,
    });
  } catch (error: any) {
    console.error("Calculate commissions error:", error);
    return NextResponse.json({ error: "Failed: " + error.message }, { status: 500 });
  }
}
