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
// POST: Create New Accession / Visit (SECURE WALLET VALIDATION)
// =========================================================================
export async function POST(req: NextRequest) {
  try {
    const user = await getDataFromToken(req);
    if (!user || !user.labId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { 
      patientId, 
      tests, 
      doctorId, 
      agencyId, 
      subtotal, 
      discountAmount, 
      grandTotal 
      // 🚫 Notice: We completely ignore 'isNewVisit' from the frontend now
    } = body;

    if (!patientId || !tests || tests.length === 0) {
      return NextResponse.json({ error: 'Patient ID and at least one test are required.' }, { status: 400 });
    }

    // 1. 🛡️ SERVER-SIDE TRUTH: Did we already charge this patient today?
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const existingDeductionToday = await prisma.walletDeduction.findFirst({
        where: {
            labId: user.labId,
            patientId: patientId,
            createdAt: { gte: startOfToday } // Checks if a deduction happened since midnight
        }
    });

    const isActuallyNewVisit = !existingDeductionToday;

    // 2. Validate Pay-As-You-Go Wallet Balance
    const wallet = await prisma.labWallet.findUnique({ where: { labId: user.labId } });
    if (!wallet) return NextResponse.json({ error: "Wallet not initialized." }, { status: 400 });

    const visitFee = Number(wallet.perPatientFee || 2.5);

    // Block the transaction if it's a true new visit but funds are low
    if (isActuallyNewVisit && Number(wallet.balance) < visitFee) {
      return NextResponse.json({ 
        error: "Insufficient wallet balance to start a new visit. Please recharge.",
        required: visitFee 
      }, { status: 402 });
    }

    // 3. Resolve Doctor & Agency
    const isDbId = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
    const finalDoctorId = doctorId && isDbId(doctorId) ? doctorId : null;
    const finalAgencyId = agencyId && isDbId(agencyId) ? agencyId : null;

    // 4. Generate Sequences (Invoice No)
    const config = await prisma.systemConfig.findFirst();
    const invPrefix = config?.invoicePrefix || "INV";
    
    // ✅ 5. ACID TRANSACTION: Process Booking & Secure Deduction
    const accessionData = await prisma.$transaction(async (tx) => {
        
        // --- A. SECURE WALLET DEDUCTION ---
        if (isActuallyNewVisit) {
            await tx.labWallet.update({
                where: { labId: user.labId },
                data: { balance: { decrement: visitFee } }
            });

            await tx.walletTransaction.create({
                data: {
                    labId: user.labId,
                    type: 'DEDUCTION',
                    amount: visitFee,
                    closingBalance: Number(wallet.balance) - visitFee,
                    description: `Visit Booking Fee for Patient ID: ${patientId}`
                }
            });

            // Log the deduction for today so they aren't charged again if they add tests later
            await tx.walletDeduction.create({
                data: {
                  labId: user.labId,
                  patientId: patientId,
                  date: new Date(),
                  amount: visitFee
                }
            });
        }

        // --- B. CREATE INVOICE ---
        const lastInvoice = await tx.invoice.findFirst({
            where: { labId: user.labId },
            orderBy: { createdAt: 'desc' }
        });
        const nextInvNum = lastInvoice ? parseInt(lastInvoice.invoiceNumber.split('-').pop() || '0') + 1 : 1;
        const generatedInvoiceNumber = `${invPrefix}-${nextInvNum.toString().padStart(5, '0')}`;

        const invoice = await tx.invoice.create({
            data: {
                labId: user.labId,
                branchId: user.branchId,
                patientId: patientId,
                doctorId: finalDoctorId,
                agencyId: finalAgencyId,
                invoiceNumber: generatedInvoiceNumber,
                subtotal: Number(subtotal || 0),
                discount: Number(discountAmount || 0),
                taxableAmount: Number(grandTotal || 0),
                totalTax: 0.00,
                grandTotal: Number(grandTotal || 0),
                status: 'PENDING',
                paymentStatus: 'PENDING',
                
                items: {
                    create: tests.map((t: any) => ({
                        description: t.testName,
                        unitPrice: Number(t.price || 0),
                        quantity: 1,
                        discount: 0,
                        taxRate: 0,
                        taxAmount: 0,
                        total: Number(t.price || 0)
                    }))
                }
            }
        });

        // --- C. CREATE TEST RECORDS ---
        const createdTests = [];
        for (let i = 0; i < tests.length; i++) {
            const t = tests[i];
            const testNumSequence = `${Date.now().toString().slice(-6)}${i}`;
            
            const testRecord = await tx.test.create({
                data: {
                    labId: user.labId,
                    branchId: user.branchId,
                    patientId: patientId,
                    invoiceId: invoice.id,
                    doctorId: finalDoctorId,
                    agencyId: finalAgencyId,
                    testNumber: `T-${testNumSequence}`,
                    testCode: t.testCode,
                    testName: t.testName,
                    price: Number(t.price || 0),
                    finalPrice: Number(t.price || 0),
                    status: 'PENDING',
                    priority: 'NORMAL'
                }
            });
            createdTests.push(testRecord);
        }

        // --- D. DETAILED ACTIVITY LOG ---
        await tx.activityLog.create({
          data: {
            labId: user.labId,
            userId: user.id,
            action: 'VISIT_CREATED',
            entityType: 'INVOICE',
            entity: 'VISIT',
            entityId: invoice.id,
            description: `Booked visit (${tests.length} tests). Invoice: ${generatedInvoiceNumber}.`,
            details: { 
              patientId, 
              invoiceNumber: generatedInvoiceNumber, 
              testCount: tests.length,
              feeDeducted: isActuallyNewVisit ? visitFee : 0 
            }
          }
        });

        return { invoice, tests: createdTests };
    });

    return NextResponse.json({ success: true, data: accessionData });

  } catch (error: any) {
    console.error("POST ACCESSION ERROR:", error);
    if (error.code === 'P2002') {
         return NextResponse.json({ error: "System busy generating unique IDs. Please click Save again." }, { status: 409 });
    }
    return NextResponse.json({ error: error.message || "Failed to create visit booking" }, { status: 500 });
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