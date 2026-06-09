import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getDataFromToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// =========================================================================
// GET: Fetch Recent Accessions / Visits
// =========================================================================
export async function GET(req: NextRequest) {
  try {
    const user = await getDataFromToken(req);
    if (!user || !user.labId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const patientId = searchParams.get('patientId');
    const limit = parseInt(searchParams.get('limit') || '50');

    let where: any = { labId: user.labId };
    
    // Enterprise Branch Scoping
    if (user.role !== 'LAB_OWNER' && user.role !== 'SUPER_ADMIN' && user.branchId) {
      where.OR = [{ branchId: user.branchId }, { branchId: null }];
    }

    if (patientId) where.patientId = patientId;

    const accessions = await prisma.test.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        patient: { select: { name: true, patientId: true, phone: true, gender: true, age: true, ageUnit: true } },
        doctor: { select: { name: true } },
        agency: { select: { agencyName: true } },
        invoice: { select: { invoiceNumber: true, status: true, grandTotal: true } },
        sample: { select: { sampleId: true, status: true } }
      }
    });

    return NextResponse.json({ data: accessions });

  } catch (error: any) {
    console.error("GET ACCESSION ERROR:", error);
    return NextResponse.json({ error: 'Fetch failed', details: error.message }, { status: 500 });
  }
}

// =========================================================================
// POST: Optimized Accession Booking
// =========================================================================
export async function POST(req: NextRequest) {
  try {
    const user = await getDataFromToken(req);
    if (!user?.labId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { patientId, tests, doctorId, agencyId, subtotal, discountAmount, grandTotal } = body;

    // 1. Perform all preliminary logic OUTSIDE the transaction to keep it short
    const wallet = await prisma.labWallet.findUnique({ where: { labId: user.labId } });
    if (!wallet) return NextResponse.json({ error: "Wallet not initialized." }, { status: 400 });

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    // 2. Wrap ONLY database-writing operations in the transaction
    const result = await prisma.$transaction(async (tx) => {
        
        // A. Check for existing fee today (only one DB call)
        const existingDeduction = await tx.walletDeduction.findFirst({
            where: { labId: user.labId, patientId, createdAt: { gte: startOfToday } }
        });
        const visitFee = Number(wallet.perPatientFee || 2.5);
        const isNewVisit = !existingDeduction;

        if (isNewVisit && Number(wallet.balance) < visitFee) {
            throw new Error("INSUFFICIENT_FUNDS"); // Will trigger a catch block outside
        }

        if (isNewVisit) {
            await tx.labWallet.update({ where: { labId: user.labId }, data: { balance: { decrement: visitFee } } });
            await tx.walletDeduction.create({ data: { labId: user.labId, patientId, date: new Date(), amount: visitFee } });
        }

        // B. Generate Invoice Number (Keep logic simple)
        const count = await tx.invoice.count({ where: { labId: user.labId } });
        const invoiceNumber = `INV-${(count + 1).toString().padStart(5, '0')}`;

        // C. Create Invoice AND Items in one go
        const invoice = await tx.invoice.create({
            data: {
                labId: user.labId,
                branchId: user.branchId,
                patientId,
                invoiceNumber,
                subtotal: Number(subtotal),
                discount: Number(discountAmount),
                taxableAmount: Number(grandTotal),
                totalTax: 0,
                grandTotal: Number(grandTotal),
                status: 'PENDING',
                paymentStatus: 'PENDING',
                items: {
                    create: tests.map((t: any) => ({
                        description: t.testName,
                        unitPrice: Number(t.price),
                        quantity: 1,
                        taxRate: 0,
                        taxAmount: 0,
                        total: Number(t.price)
                    }))
                }
            }
        });

        // D. Batch create tests
        await tx.test.createMany({
            data: tests.map((t: any, i: number) => ({
                labId: user.labId,
                branchId: user.branchId,
                patientId,
                invoiceId: invoice.id,
                testNumber: `T-${Date.now()}-${i}`,
                testCode: t.testCode,
                testName: t.testName,
                finalPrice: Number(t.price || 0),
                price: Number(t.price),
                status: 'PENDING'
            }))
        });

        return invoice;
    }, { timeout: 10000 }); // Increase timeout to 10s just in case

    return NextResponse.json({ success: true, data: { invoice: result } });

  } catch (error: any) {
    if (error.message === "INSUFFICIENT_FUNDS") {
        return NextResponse.json({ error: "Insufficient wallet balance." }, { status: 402 });
    }
    console.error("POST ACCESSION ERROR:", error);
    return NextResponse.json({ error: "Transaction failed." }, { status: 500 });
  }
}

// =========================================================================
// PATCH: Update Accession/Visit (Cancel Tests, Update Doctor)
// =========================================================================
export async function PATCH(req: NextRequest) {
  try {
    const user = await getDataFromToken(req);
    if (!user || !user.labId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { testId, action, notes } = body;

    if (!testId || !action) {
      return NextResponse.json({ error: 'Test ID and Action are required' }, { status: 400 });
    }

    const updatedTest = await prisma.$transaction(async (tx) => {
      
      let updateData: any = {};
      
      if (action === 'CANCEL') {
        updateData.status = 'CANCELLED';
        updateData.notes = notes || 'Cancelled by staff';
      }

      const test = await tx.test.update({
        where: { id: testId, labId: user.labId },
        data: updateData,
        include: { patient: { select: { name: true } } }
      });

      // Audit Log for modification
      await tx.activityLog.create({
        data: {
          labId: user.labId,
          userId: user.id,
          action: 'TEST_UPDATED',
          entityType: 'TEST',
          entity: 'TEST',
          entityId: test.id,
          description: `Test ${test.testCode} status updated to ${action} for ${test.patient.name}`,
          details: { action, notes }
        }
      });

      return test;
    });

    return NextResponse.json({ success: true, data: updatedTest });

  } catch (error: any) {
    console.error("PATCH ACCESSION ERROR:", error);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}