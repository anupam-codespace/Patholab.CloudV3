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

    // 1. Fetch wallet status outside transaction
    const wallet = await prisma.labWallet.findUnique({ where: { labId: user.labId } });
    if (!wallet) return NextResponse.json({ error: "Wallet not initialized." }, { status: 400 });

    const result = await prisma.$transaction(async (tx) => {
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        // Fetch patient for a clean Ledger description
        const patient = await tx.patient.findUnique({ where: { id: patientId } });
        const patientName = patient?.name || "Unknown Patient";

        // A. DEDUCTION CHECK: Look for exact ID pattern in today's transactions
        const existingDeduction = await tx.walletTransaction.findFirst({
            where: { 
                labId: user.labId, 
                type: 'DEDUCTION',
                description: { contains: `[ID: ${patientId}]` }, 
                createdAt: { gte: startOfToday } 
            }
        });

        const visitFee = Number(wallet.perPatientFee || 2.5);

        // B. ONLY DEDUCT IF NO PRIOR DEDUCTION FOUND TODAY
        if (!existingDeduction) {
            const currentWallet = await tx.labWallet.findUnique({ where: { labId: user.labId } });
            if (Number(currentWallet?.balance) < visitFee) {
                throw new Error("INSUFFICIENT_FUNDS");
            }

            const updatedWallet = await tx.labWallet.update({
                where: { labId: user.labId },
                data: { balance: { decrement: visitFee } }
            });

            // ✅ BEAUTIFUL FORMAT: Shows name to humans, contains ID for system checks
            await tx.walletTransaction.create({
                data: {
                    labId: user.labId,
                    type: 'DEDUCTION',
                    amount: visitFee,
                    closingBalance: updatedWallet.balance,
                    description: `Registration fee for: ${patientName} [ID: ${patientId}]`,
                }
            });
        }

        // C. DAILY VISIT ID GENERATION (Format: DDMMYY-XXXX)
        const d = new Date();
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yy = String(d.getFullYear()).slice(2);
        const datePrefix = `${dd}${mm}${yy}`; // e.g. "100626"

        const countToday = await tx.invoice.count({ 
            where: { labId: user.labId, createdAt: { gte: startOfToday } } 
        });
        
        // This is the "Visit Lab ID" -> e.g. "100626-0001"
        const invoiceNumber = `${datePrefix}-${(countToday + 1).toString().padStart(4, '0')}`;

        // D. CREATE INVOICE
        const invoice = await tx.invoice.create({
            data: {
                labId: user.labId,
                branchId: user.branchId,
                patientId,
                invoiceNumber, // Used as Visit ID
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

        // E. CREATE TESTS (Individually to capture IDs)
        const createdTests = [];
        for (const [i, t] of tests.entries()) {
            const test = await tx.test.create({
                data: {
                    labId: user.labId,
                    branchId: user.branchId,
                    patientId,
                    invoiceId: invoice.id,
                    testNumber: `T-${datePrefix}-${Math.floor(Math.random() * 10000)}`,
                    testCode: t.testCode,
                    testName: t.testName,
                    finalPrice: Number(t.price || 0),
                    price: Number(t.price),
                    status: 'PENDING'
                }
            });
            createdTests.push(test);
        }

        // F. LINK SAMPLES TO TESTS (Grouping by container)
        const samplesToCreate = tests.reduce((acc: any, t: any) => {
            const key = t.containerTypeId || 'default';
            if (!acc[key]) acc[key] = [];
            acc[key].push(t);
            return acc;
        }, {});

        for (const [containerId, groupTests] of Object.entries(samplesToCreate)) {
            await tx.sample.create({
                data: {
                    labId: user.labId,
                    branchId: user.branchId,
                    patientId,
                    // Format sample barcode as VisitID-RandomDigit (e.g. 100626-0001-1)
                    sampleId: `${invoiceNumber}-${Math.floor(Math.random() * 10)}`,
                    containerTypeId: containerId === 'default' ? null : containerId,
                    status: 'COLLECTED',
                    tests: {
                        connect: (groupTests as any[]).map((t: any) => ({
                            // Safely look up the ID from our createdTests array
                            id: createdTests.find(x => x.testCode === t.testCode)?.id
                        }))
                    }
                }
            });
        }

        return { ...invoice, tests: createdTests };
    }, { timeout: 10000 });

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