import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getDataFromToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// =========================================================================
// Helper: Match Reference Range for Snapshots (Backend Logic for Accuracy)
// =========================================================================
function getMatchingRange(parameter: any, patient: any) {
    if (!parameter.referenceRanges || parameter.referenceRanges.length === 0) return null;

    // 1. Filter by Gender
    const genderMatches = parameter.referenceRanges.filter((r: any) => 
        r.gender === 'BOTH' || r.gender === patient.gender || (patient.gender === 'CUSTOM' && r.gender === 'BOTH')
    );

    // 2. Filter by Age
    let patientAgeInYears = patient.age;
    if (patient.ageUnit === 'MONTH') patientAgeInYears = patient.age / 12;
    if (patient.ageUnit === 'DAY') patientAgeInYears = patient.age / 365;

    const ageMatch = genderMatches.find((r: any) => 
        patientAgeInYears >= r.minAge && patientAgeInYears <= r.maxAge
    );

    // 3. Fallback
    return ageMatch || genderMatches[0] || parameter.referenceRanges[0];
}

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
    const { patientId, tests, subtotal, discountAmount, grandTotal, doctorId, agencyId } = body;

    // Safety guard
    if (!tests || tests.length === 0) throw new Error("NO_TESTS_SELECTED");

    // Execute the entire booking in a single, safe transaction
    const result = await prisma.$transaction(async (tx) => {

        // 🌟 FETCH PATIENT FIRST: So we can use their name in the Ledger
        const patientData = await tx.patient.findUnique({ where: { id: patientId } });
        if (!patientData) throw new Error("PATIENT_NOT_FOUND");

        const readablePatientId = patientData.patientId || patientData.id.substring(0, 8);

        // --- A. WALLET DEDUCTION & LEDGER LOGIC ---
        const wallet = await tx.labWallet.findUnique({ where: { labId: user.labId } });
        if (!wallet) throw new Error("INSUFFICIENT_FUNDS");

        const visitFee = Number(wallet.perPatientFee || 2.5);
        let newBalance = Number(wallet.balance);

        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        
        // SAFETY: Check if we already charged for this patient today
        const alreadyChargedToday = await tx.walletTransaction.findFirst({
            where: { 
                labId: user.labId,
                type: 'DEDUCTION',
                createdAt: { gte: startOfToday },
                description: { contains: `[ID: ${patientId}]` } // We still keep the hidden ID here for exact computer matching
            }
        });

        if (!alreadyChargedToday) {
            if (newBalance < visitFee) throw new Error("INSUFFICIENT_FUNDS");
            
            newBalance -= visitFee;

            // 1. Update Wallet Balance
            await tx.labWallet.update({
                where: { labId: user.labId },
                data: { balance: newBalance }
            });

            // 2. Create Ledger Transaction (✅ NOW WITH REAL NAME)
            await tx.walletTransaction.create({
                data: {
                    labId: user.labId,
                    type: 'DEDUCTION',
                    amount: visitFee,
                    closingBalance: newBalance,
                    description: `Daily Visit Fee: ${patientData.name} [ID: ${patientId}]`,
                }
            });
        }

        // --- B. GENERATE VISIT ID ---
        const datePrefix = `${String(startOfToday.getDate()).padStart(2, '0')}${String(startOfToday.getMonth() + 1).padStart(2, '0')}${String(startOfToday.getFullYear()).slice(2)}`;
        
        const countToday = await tx.invoice.count({ 
            where: { labId: user.labId, createdAt: { gte: startOfToday } } 
        });
        const invoiceNumber = `${datePrefix}-${(countToday + 1).toString().padStart(4, '0')}`;

        // --- C. CREATE INVOICE ---
        const taxableAmount = Number(subtotal) - Number(discountAmount);
        
        const invoice = await tx.invoice.create({
            data: {
                labId: user.labId,
                branchId: user.branchId,
                patientId,
                invoiceNumber,
                subtotal: Number(subtotal),
                discount: Number(discountAmount),
                taxableAmount: Number(taxableAmount),
                totalTax: 0, cgstAmount: 0, sgstAmount: 0, igstAmount: 0, roundOff: 0,
                grandTotal: Number(grandTotal),
                status: 'PENDING',
                paymentStatus: 'PENDING',
                items: { 
                    create: tests.map((t: any) => ({ 
                        description: t.testName, 
                        unitPrice: Number(t.price), 
                        quantity: 1, 
                        taxRate: 0, taxAmount: 0, total: Number(t.price) 
                    })) 
                }
            }
        });

        // --- D. HIGH PERFORMANCE BATCH FETCHING ---
        const templateIds = tests.map((t: any) => t.testTemplateId || t.testId || t.templateId || t.id).filter(Boolean);
        
        const templates = await tx.testTemplate.findMany({
            where: { id: { in: templateIds } },
            include: { 
                parameters: { 
                    include: { parameter: { include: { referenceRanges: true } } } 
                } 
            }
        });

        const templateMap = new Map(templates.map(t => [t.id, t]));
        const samplesMap: Record<string, any[]> = {}; 

        // --- E. CREATE TESTS & SNAPSHOT RESULTS ---
        for (const t of tests) {
            const templateId = t.testTemplateId || t.testId || t.templateId || t.id;
            const template = templateMap.get(templateId);

            if (!template) throw new Error(`TEMPLATE_NOT_FOUND: ${t.testName}`);

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
                    // ✅ Link doctor and agency to the test for commission calculation
                    doctorId: doctorId || null,
                    agencyId: agencyId || null,
                    results: {
                        create: template.parameters.map(p => {
                            const range = getMatchingRange(p.parameter, patientData);
                            const refText = range ? (range.textValue || `${range.lowValue} - ${range.highValue}`) : "-";

                            return {
                                parameterCode: p.parameter.code,
                                printName: p.parameter.printName || p.parameter.name,
                                method: p.parameter.method || "",
                                order: p.order,
                                referenceRangeText: refText,
                            };
                        })
                    }
                }
            });

            const containerKey = template.containerTypeId || 'DEFAULT';
            if (!samplesMap[containerKey]) samplesMap[containerKey] = [];
            samplesMap[containerKey].push(createdTest.id);
        }

        // --- F. CREATE PHYSICAL SAMPLES ---
        for (const [containerId, testIds] of Object.entries(samplesMap)) {
            const sampleSuffix = containerId === 'DEFAULT' ? Math.floor(Math.random() * 1000) : containerId.substring(0, 4).toUpperCase();

            await tx.sample.create({
                data: {
                    labId: user.labId,
                    branchId: user.branchId,
                    sampleId: `${invoiceNumber}-${sampleSuffix}`,
                    patientId,
                    containerTypeId: containerId === 'DEFAULT' ? null : containerId,
                    status: 'COLLECTED',
                    tests: { connect: testIds.map(id => ({ id })) }
                }
            });
        }

        // ==========================================
        // --- G. COMMISSION CALCULATION & AGENCY INVOICE ---
        // ==========================================

        // Fetch lab-level commission defaults
        const lab = await tx.lab.findUnique({
            where: { id: user.labId },
            select: { defaultDoctorCommission: true, defaultAgencyCommission: true, commissionType: true, name: true }
        });

        let totalDoctorCommission = 0;
        let totalAgencyCommission = 0;
        let agencyInvoiceId: string | null = null;

        // --- G1. FETCH DOCTOR & AGENCY DETAILS ---
        let doctorData: any = null;
        let agencyData: any = null;

        if (doctorId) {
            doctorData = await tx.doctor.findFirst({
                where: { id: doctorId, labId: user.labId },
            });
        }
        if (agencyId) {
            agencyData = await tx.agency.findFirst({
                where: { id: agencyId, labId: user.labId },
            });
        }

        // --- G2. FETCH CUSTOM COMMISSIONS ---
        const allTemplateIds = tests.map((t: any) => t.testTemplateId || t.testId || t.templateId || t.id).filter(Boolean);

        const [doctorCustoms, agencyCustoms] = await Promise.all([
            doctorId
                ? tx.doctorCustomCommission.findMany({ where: { doctorId, testTemplateId: { in: allTemplateIds } } })
                : [],
            agencyId
                ? tx.agencyCustomCommission.findMany({ where: { agencyId, testTemplateId: { in: allTemplateIds } } })
                : [],
        ]);

        const doctorCustomMap = new Map(doctorCustoms.map((dc: any) => [dc.testTemplateId, dc]));
        const agencyCustomMap = new Map(agencyCustoms.map((ac: any) => [ac.testTemplateId, ac]));

        // --- G3. FETCH CREATED TESTS (to link commissions) ---
        const createdTests = await tx.test.findMany({
            where: { invoiceId: invoice.id },
            select: { id: true, testTemplateId: true, testName: true, price: true }
        });

        // --- G4. CALCULATE COMMISSIONS PER TEST + BUILD AGENCY INVOICE ITEMS ---
        const agencyInvoiceItems: any[] = [];

        for (const ct of createdTests) {
            const baseAmount = Number(ct.price || 0);
            if (baseAmount <= 0) continue;

            // DOCTOR COMMISSION
            if (doctorId && doctorData) {
                const custom = doctorCustomMap.get(ct.testTemplateId);
                let commissionAmount = 0;
                let rate = 0;
                let type: 'PERCENTAGE' | 'FIXED' | 'NET_PRICE' = 'PERCENTAGE';

                if (custom) {
                    type = custom.commissionType;
                    rate = Number(custom.commissionRate || 0);
                    if (type === 'PERCENTAGE') commissionAmount = (baseAmount * rate) / 100;
                    else if (type === 'FIXED') commissionAmount = rate;
                    else if (type === 'NET_PRICE') commissionAmount = Math.max(0, baseAmount - Number(custom.netPrice || 0));
                } else {
                    rate = Number(lab?.defaultDoctorCommission || 0);
                    commissionAmount = (baseAmount * rate) / 100;
                }

                if (commissionAmount > 0) {
                    totalDoctorCommission += commissionAmount;
                    await tx.commission.create({
                        data: {
                            testId: ct.id,
                            doctorId,
                            amount: commissionAmount,
                            type,
                            rate,
                            status: 'PENDING',
                        }
                    });
                }
            }

            // AGENCY COMMISSION + AGENCY INVOICE ITEM
            if (agencyId && agencyData) {
                const custom = agencyCustomMap.get(ct.testTemplateId);
                let commissionAmount = 0;
                let rate = 0;
                let type: 'PERCENTAGE' | 'FIXED' | 'NET_PRICE' = 'PERCENTAGE';
                let agencyNetPrice = baseAmount;

                if (custom) {
                    type = custom.commissionType;
                    rate = Number(custom.commissionRate || 0);
                    if (type === 'PERCENTAGE') {
                        commissionAmount = (baseAmount * rate) / 100;
                        agencyNetPrice = baseAmount - commissionAmount;
                    } else if (type === 'FIXED') {
                        commissionAmount = rate;
                        agencyNetPrice = baseAmount - rate;
                    } else if (type === 'NET_PRICE') {
                        agencyNetPrice = Number(custom.netPrice || 0);
                        commissionAmount = Math.max(0, baseAmount - agencyNetPrice);
                    }
                } else {
                    rate = Number(lab?.defaultAgencyCommission || 0);
                    commissionAmount = (baseAmount * rate) / 100;
                    agencyNetPrice = baseAmount - commissionAmount;
                }

                if (commissionAmount > 0) {
                    totalAgencyCommission += commissionAmount;
                    await tx.commission.create({
                        data: {
                            testId: ct.id,
                            agencyId,
                            amount: commissionAmount,
                            type,
                            rate,
                            status: 'PENDING',
                        }
                    });
                }

                // Agency invoice item with B2B net price
                agencyInvoiceItems.push({
                    description: ct.testName,
                    unitPrice: agencyNetPrice,
                    quantity: 1,
                    taxRate: 0,
                    taxAmount: 0,
                    total: agencyNetPrice,
                });
            }
        }

        // --- G5. CREATE HIDDEN AGENCY INVOICE (B2B) ---
        if (agencyId && agencyData && agencyInvoiceItems.length > 0) {
            const agencySubtotal = agencyInvoiceItems.reduce((s, i) => s + i.total, 0);
            const agencyInvoiceNumber = `B2B-${invoiceNumber}`;

            const agencyInvoice = await tx.invoice.create({
                data: {
                    labId: user.labId,
                    branchId: user.branchId,
                    patientId,
                    agencyId,
                    invoiceNumber: agencyInvoiceNumber,
                    subtotal: agencySubtotal,
                    discount: 0,
                    taxableAmount: agencySubtotal,
                    totalTax: 0, cgstAmount: 0, sgstAmount: 0, igstAmount: 0, roundOff: 0,
                    grandTotal: agencySubtotal,
                    status: 'PENDING',
                    paymentStatus: 'PENDING',
                    isB2B: true, // ✅ Hidden flag — only visible on agency view
                    items: { create: agencyInvoiceItems }
                }
            });
            agencyInvoiceId = agencyInvoice.id;
        }

        return { ...invoice, agencyInvoiceId, totalDoctorCommission, totalAgencyCommission };
    }, { 
        maxWait: 20000, 
        timeout: 60000  
    }); 

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    if (error.message === "PATIENT_NOT_FOUND") return NextResponse.json({ error: "Patient record not found." }, { status: 404 });
    if (error.message === "INSUFFICIENT_FUNDS") return NextResponse.json({ error: "Insufficient wallet balance to register patient." }, { status: 402 });
    if (error.message === "NO_TESTS_SELECTED") return NextResponse.json({ error: "No tests were selected for this invoice." }, { status: 400 });
    
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