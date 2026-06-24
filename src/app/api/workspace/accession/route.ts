import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getDataFromToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// =========================================================================
// 1. GET: Fetch Recent Accessions / Visits (Worklist)
// =========================================================================
export async function GET(req: NextRequest) {
  try {
    const user = await getDataFromToken(req);
    if (!user || !user.labId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const patientId = searchParams.get('patientId');
    const limit = parseInt(searchParams.get('limit') || '50');

    let where: any = { labId: user.labId };
    
    // Enterprise Branch Scoping: Managers only see their branch's accessions
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
// 2. POST: Complete Accession Booking Engine
// =========================================================================
export async function POST(req: NextRequest) {
  try {
    const user = await getDataFromToken(req);
    if (!user?.labId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { patientId, tests, subtotal, discountAmount, grandTotal } = body;

    // Execute the entire booking in a single, safe transaction
    const result = await prisma.$transaction(async (tx) => {
        
        // --- A. WALLET DEDUCTION LOGIC ---
        const wallet = await tx.labWallet.findUnique({ where: { labId: user.labId } });
        if (!wallet) throw new Error("INSUFFICIENT_FUNDS");

        const visitFee = Number(wallet.perPatientFee || 2.5);
        if (Number(wallet.balance) < visitFee) throw new Error("INSUFFICIENT_FUNDS");

        await tx.labWallet.update({
            where: { labId: user.labId },
            data: { balance: { decrement: visitFee } }
        });

        // --- B. GENERATE VISIT ID (e.g., 240626-0001) ---
        const d = new Date();
        const datePrefix = `${String(d.getDate()).padStart(2, '0')}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getFullYear()).slice(2)}`;
        
        // Count invoices created today to append sequential number
        const countToday = await tx.invoice.count({ 
            where: { labId: user.labId, createdAt: { gte: new Date(d.setHours(0,0,0,0)) } } 
        });
        const invoiceNumber = `${datePrefix}-${(countToday + 1).toString().padStart(4, '0')}`;

        // --- C. CREATE INVOICE (With Strict Schema Compliance) ---
        const taxableAmount = Number(subtotal) - Number(discountAmount);
        
        const invoice = await tx.invoice.create({
            data: {
                labId: user.labId,
                branchId: user.branchId,
                patientId,
                invoiceNumber, // This doubles as our Visit ID
                subtotal: Number(subtotal),
                discount: Number(discountAmount),
                taxableAmount: Number(taxableAmount),
                
                // Explicitly defining zero-values to satisfy strict Prisma Decimals
                totalTax: 0,
                cgstAmount: 0,
                sgstAmount: 0,
                igstAmount: 0,
                roundOff: 0,
                
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

        // --- D. CREATE TESTS, SNAPSHOT RESULTS & PREP SAMPLES ---
        const testsWithTemplates = [];
        const samplesMap: Record<string, any[]> = {}; // Map to pool tests by Container

        for (const t of tests) {
            // 1. Smart ID Resolution (Defends against frontend naming inconsistencies)
            const templateId = t.testTemplateId || t.testId || t.templateId || t.id;

            if (!templateId) {
                throw new Error(`MISSING_TEMPLATE_ID: Payload: ${JSON.stringify(t)}`);
            }

            // 2. Fetch the Blueprint
            const template = await tx.testTemplate.findUnique({
                where: { id: templateId },
                include: { 
                    parameters: { 
                        include: { 
                            parameter: { include: { referenceRanges: true } } 
                        } 
                    } 
                }
            });

            if (!template) throw new Error(`TEMPLATE_NOT_FOUND: ${t.testName}`);

            // 3. Create Test & Snapshot the Parameters for the Result Entry Page
            const createdTest = await tx.test.create({
                data: {
                    labId: user.labId,
                    branchId: user.branchId,
                    patientId,
                    invoiceId: invoice.id,
                    testNumber: `T-${invoiceNumber}-${t.testCode}`,
                    testCode: t.testCode,
                    testName: t.testName,
                    testTemplateId: template.id,
                    price: Number(t.price || 0),
                    finalPrice: Number(t.price || 0),
                    status: 'PENDING',
                    
                    // 🌟 MAGIC: Freezing the parameters into the patient's record
                    results: {
                        create: template.parameters.map(p => {
                            // Extract standard reference range text for the snapshot
                            const standardRange = p.parameter.referenceRanges.find(r => r.gender === 'BOTH' || r.gender === 'MALE' || r.gender === 'FEMALE');
                            const refText = standardRange ? (standardRange.textValue || `${standardRange.lowValue} - ${standardRange.highValue}`) : "-";

                            return {
                                parameterCode: p.parameter.code,
                                printName: p.parameter.printName || p.parameter.name,
                                method: p.parameter.method || "",
                                order: p.order,
                                referenceRangeText: refText, // Stores historical range text permanently
                            };
                        })
                    }
                }
            });
            
            testsWithTemplates.push(createdTest);

            // 4. Group tests by Container Type for physical tube generation
            const containerKey = template.containerTypeId || 'DEFAULT';
            if (!samplesMap[containerKey]) samplesMap[containerKey] = [];
            samplesMap[containerKey].push(createdTest.id);
        }

        // --- E. CREATE PHYSICAL SAMPLES (Tubes/Barcodes) ---
        // Loops through grouped containers and creates 1 sample per container type
        for (const [containerId, testIds] of Object.entries(samplesMap)) {
            // Give the barcode a suffix based on container (or generic random digit if default)
            const sampleSuffix = containerId === 'DEFAULT' ? Math.floor(Math.random() * 1000) : containerId.substring(0, 4).toUpperCase();
            
            await tx.sample.create({
                data: {
                    labId: user.labId,
                    branchId: user.branchId,
                    sampleId: `${invoiceNumber}-${sampleSuffix}`,
                    patientId,
                    containerTypeId: containerId === 'DEFAULT' ? null : containerId,
                    status: 'COLLECTED',
                    tests: {
                        // Connect all tests that share this physical tube
                        connect: testIds.map(id => ({ id }))
                    }
                }
            });
        }

        return invoice;
    }, { timeout: 15000 }); // Generous timeout for complex LIMS processing

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    if (error.message === "INSUFFICIENT_FUNDS") {
        return NextResponse.json({ error: "Insufficient wallet balance to register patient." }, { status: 402 });
    }
    console.error("POST ACCESSION ERROR:", error);
    return NextResponse.json({ error: "Failed to book tests.", details: error.message }, { status: 500 });
  }
}

// =========================================================================
// 3. PATCH: Update Accession/Visit (Cancel Tests, Status changes)
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