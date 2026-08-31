import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getDataFromToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// =========================================================================
// Helper: Match Reference Range for Snapshots
// =========================================================================
function getMatchingRange(parameter: any, patient: any) {
    if (!parameter.referenceRanges || parameter.referenceRanges.length === 0) return null;
    const genderMatches = parameter.referenceRanges.filter((r: any) =>
        r.gender === 'BOTH' || r.gender === patient.gender || (patient.gender === 'CUSTOM' && r.gender === 'BOTH')
    );
    let patientAgeInYears = patient.age;
    if (patient.ageUnit === 'MONTH') patientAgeInYears = patient.age / 12;
    if (patient.ageUnit === 'DAY') patientAgeInYears = patient.age / 365;
    const ageMatch = genderMatches.find((r: any) =>
        patientAgeInYears >= r.minAge && patientAgeInYears <= r.maxAge
    );
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
//    - Creates invoice, tests, samples
//    - Links doctor & agency to each test
//    - Auto-calculates commissions per test (doctor + agency)
//    - Creates hidden B2B agency invoice with agency net rates
// =========================================================================
export async function POST(req: NextRequest) {
  try {
    const user = await getDataFromToken(req);
    if (!user?.labId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { patientId, tests, subtotal, discountAmount, grandTotal, doctorId, agencyId } = body;

    if (!tests || tests.length === 0) throw new Error("NO_TESTS_SELECTED");

    const result = await prisma.$transaction(async (tx) => {

        // --- A. FETCH PATIENT ---
        const patientData = await tx.patient.findUnique({ where: { id: patientId } });
        if (!patientData) throw new Error("PATIENT_NOT_FOUND");

        // --- B. WALLET DEDUCTION ---
        const wallet = await tx.labWallet.findUnique({ where: { labId: user.labId } });
        if (!wallet) throw new Error("INSUFFICIENT_FUNDS");

        const visitFee = Number(wallet.perPatientFee || 2.5);
        let newBalance = Number(wallet.balance);

        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        const alreadyChargedToday = await tx.walletTransaction.findFirst({
            where: {
                labId: user.labId,
                type: 'DEDUCTION',
                createdAt: { gte: startOfToday },
                description: { contains: `[ID: ${patientId}]` }
            }
        });

        if (!alreadyChargedToday) {
            if (newBalance < visitFee) throw new Error("INSUFFICIENT_FUNDS");
            newBalance -= visitFee;
            await tx.labWallet.update({ where: { labId: user.labId }, data: { balance: newBalance } });
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

        // --- C. GENERATE INVOICE NUMBER ---
        const datePrefix = `${String(startOfToday.getDate()).padStart(2, '0')}${String(startOfToday.getMonth() + 1).padStart(2, '0')}${String(startOfToday.getFullYear()).slice(2)}`;
        const countToday = await tx.invoice.count({ where: { labId: user.labId, createdAt: { gte: startOfToday } } });
        const invoiceNumber = `${datePrefix}-${(countToday + 1).toString().padStart(4, '0')}`;

        // --- D. CREATE MAIN INVOICE (patient-facing) ---
        const taxableAmount = Number(subtotal) - Number(discountAmount);
        const invoice = await tx.invoice.create({
            data: {
                labId: user.labId,
                branchId: user.branchId,
                patientId,
                agencyId: agencyId || null,
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

        // --- E. FETCH TEMPLATES ---
        const templateIds = tests.map((t: any) => t.testTemplateId || t.testId || t.templateId || t.id).filter(Boolean);
        const templates = await tx.testTemplate.findMany({
            where: { id: { in: templateIds } },
            include: { parameters: { include: { parameter: { include: { referenceRanges: true } } } } }
        });
        const templateMap = new Map(templates.map(t => [t.id, t]));
        const samplesMap: Record<string, any[]> = {};

        // --- F. FETCH DOCTOR & AGENCY DATA (for commissions) ---
        let doctorData: any = null;
        let agencyData: any = null;
        let labData: any = null;

        labData = await tx.lab.findUnique({
            where: { id: user.labId },
            select: { defaultDoctorCommission: true, defaultAgencyCommission: true, commissionType: true }
        });

        // ✅ v3.2.1 FIX: Support doctor lookup by NAME (not just ID).
        // The registration page passes the doctor NAME via URL param `doc=...`
        // when navigating to accession. Previously the accession API only did
        // `findFirst({ where: { id: doctorId }})` which returned null for names,
        // silently dropping the referral. Now we look up by ID first, then by name.
        if (doctorId && doctorId !== 'Self' && doctorId !== 'null') {
            // First, try by ID (UUID/CUID)
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(doctorId) || /^c[a-z0-9]{20,}$/i.test(doctorId);
            if (isUuid) {
                doctorData = await tx.doctor.findFirst({
                    where: { id: doctorId, labId: user.labId },
                });
            }

            // If not found by ID (or wasn't an ID), try by name (case-insensitive)
            if (!doctorData) {
                doctorData = await tx.doctor.findFirst({
                    where: {
                        labId: user.labId,
                        name: { equals: doctorId, mode: 'insensitive' },
                        deletedAt: null,
                    },
                });
            }

            // ✅ If still not found, AUTO-CREATE the doctor (mirrors registration page behavior)
            if (!doctorData) {
                doctorData = await tx.doctor.create({
                    data: {
                        labId: user.labId,
                        name: doctorId.trim(),
                        commissionRate: 0,
                        commissionType: 'PERCENTAGE',
                    },
                });

                await tx.activityLog.create({
                    data: {
                        labId: user.labId,
                        userId: user.id,
                        action: 'DOCTOR_AUTO_CREATED',
                        entityType: 'DOCTOR',
                        entity: 'DOCTOR',
                        entityId: doctorData.id,
                        description: `Doctor "${doctorData.name}" auto-created during accession (visit booking).`,
                    },
                }).catch(() => { /* non-fatal */ });
            }
        }

        if (agencyId && agencyId !== 'Direct' && agencyId !== 'null') {
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(agencyId) || /^c[a-z0-9]{20,}$/i.test(agencyId);
            if (isUuid) {
                agencyData = await tx.agency.findFirst({
                    where: { id: agencyId, labId: user.labId },
                });
            }
            if (!agencyData) {
                agencyData = await tx.agency.findFirst({
                    where: {
                        labId: user.labId,
                        agencyName: { equals: agencyId, mode: 'insensitive' },
                    },
                });
            }
            // ✅ Auto-create agency if not found
            if (!agencyData) {
                agencyData = await tx.agency.create({
                    data: {
                        labId: user.labId,
                        agencyName: agencyId.trim(),
                        commissionRate: 0,
                        commissionType: 'PERCENTAGE',
                    },
                });

                await tx.activityLog.create({
                    data: {
                        labId: user.labId,
                        userId: user.id,
                        action: 'AGENCY_AUTO_CREATED',
                        entityType: 'AGENCY',
                        entity: 'AGENCY',
                        entityId: agencyData.id,
                        description: `Agency "${agencyData.agencyName}" auto-created during accession.`,
                    },
                }).catch(() => { /* non-fatal */ });
            }
        }

        // --- G. FETCH CUSTOM COMMISSIONS ---
        const allTemplateIds = templateIds;
        const [doctorCustoms, agencyCustoms] = await Promise.all([
            (doctorData)
                ? tx.doctorCustomCommission.findMany({ where: { doctorId: doctorData.id, testTemplateId: { in: allTemplateIds } } })
                : [],
            (agencyData)
                ? tx.agencyCustomCommission.findMany({ where: { agencyId: agencyData.id, testTemplateId: { in: allTemplateIds } } })
                : [],
        ]);
        const doctorCustomMap = new Map(doctorCustoms.map((dc: any) => [dc.testTemplateId, dc]));
        const agencyCustomMap = new Map(agencyCustoms.map((ac: any) => [ac.testTemplateId, ac]));

        // --- H. CREATE TESTS & SNAPSHOT RESULTS ---
        const createdTestIds: string[] = [];

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
                    // ✅ Link doctor and agency to the test
                    doctorId: doctorData?.id || null,
                    agencyId: agencyData?.id || null,
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

            createdTestIds.push(createdTest.id);

            const containerKey = template.containerTypeId || 'DEFAULT';
            if (!samplesMap[containerKey]) samplesMap[containerKey] = [];
            samplesMap[containerKey].push(createdTest.id);
        }

        // --- I. CREATE PHYSICAL SAMPLES ---
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
                    collectedAt: new Date(), // ✅ Auto-set collection timestamp
                    tests: { connect: testIds.map(id => ({ id })) }
                }
            });
        }

        // ==========================================
        // --- J. COMMISSION CALCULATION (per test) ---
        // ==========================================

        let totalDoctorCommission = 0;
        let totalAgencyCommission = 0;
        const agencyInvoiceItems: any[] = [];

        // Fetch created tests with their templateId for commission lookup
        const createdTests = await tx.test.findMany({
            where: { id: { in: createdTestIds } },
            select: { id: true, testTemplateId: true, testName: true, price: true }
        });

        for (const ct of createdTests) {
            // ✅ Commission calculated on DISCOUNTED amount (proportional discount per test)
            const testPrice = Number(ct.price || 0);
            const totalSubtotal = Number(subtotal || 0);
            const totalDiscount = Number(discountAmount || 0);
            const discountRatio = totalSubtotal > 0 ? (totalDiscount / totalSubtotal) : 0;
            const baseAmount = testPrice * (1 - discountRatio); // discounted base amount
            if (baseAmount <= 0) continue;

            // ---- DOCTOR COMMISSION ----
            if (doctorData) {
                const custom = doctorCustomMap.get(ct.testTemplateId);
                let commissionAmount = 0;
                let rate = 0;
                let type: 'PERCENTAGE' | 'FIXED' | 'NET_PRICE' = 'PERCENTAGE';

                if (custom) {
                    // DoctorCustomCommission uses commissionRate (Float) and commissionType (String: "PERCENTAGE" or "FLAT")
                    rate = Number(custom.commissionRate || 0);
                    if (custom.commissionType === 'FLAT') {
                        type = 'FIXED';
                        commissionAmount = rate;
                    } else {
                        type = 'PERCENTAGE';
                        commissionAmount = (baseAmount * rate) / 100;
                    }
                } else if (doctorData.commissionRate) {
                    // Doctor-level default
                    rate = Number(doctorData.commissionRate);
                    type = doctorData.commissionType || 'PERCENTAGE';
                    if (type === 'FIXED') {
                        commissionAmount = rate;
                    } else {
                        commissionAmount = (baseAmount * rate) / 100;
                    }
                } else if (labData?.defaultDoctorCommission) {
                    // Lab-level default
                    rate = Number(labData.defaultDoctorCommission);
                    type = 'PERCENTAGE';
                    commissionAmount = (baseAmount * rate) / 100;
                }

                if (commissionAmount > 0) {
                    totalDoctorCommission += commissionAmount;
                    await tx.commission.create({
                        data: {
                            testId: ct.id,
                            doctorId: doctorData.id,
                            amount: commissionAmount,
                            type,
                            rate,
                            status: 'PENDING',
                        }
                    });
                }
            }

            // ---- AGENCY COMMISSION + B2B INVOICE ITEM ----
            if (agencyData) {
                const custom = agencyCustomMap.get(ct.testTemplateId);
                let commissionAmount = 0;
                let rate = 0;
                let type: 'PERCENTAGE' | 'FIXED' | 'NET_PRICE' = 'PERCENTAGE';
                let agencyNetPrice = baseAmount; // what the agency pays the lab

                if (custom) {
                    // AgencyCustomCommission can use commissionRate + commissionType OR netPrice
                    if (custom.netPrice != null) {
                        // NET_PRICE mode: agency pays a fixed B2B rate
                        type = 'NET_PRICE';
                        rate = Number(custom.netPrice);
                        agencyNetPrice = Number(custom.netPrice);
                        commissionAmount = Math.max(0, baseAmount - agencyNetPrice);
                    } else if (custom.commissionRate != null) {
                        rate = Number(custom.commissionRate);
                        type = custom.commissionType || 'PERCENTAGE';
                        if (type === 'FIXED') {
                            commissionAmount = rate;
                            agencyNetPrice = baseAmount - rate;
                        } else {
                            type = 'PERCENTAGE';
                            commissionAmount = (baseAmount * rate) / 100;
                            agencyNetPrice = baseAmount - commissionAmount;
                        }
                    }
                } else if (agencyData.commissionRate) {
                    // Agency-level default
                    rate = Number(agencyData.commissionRate);
                    type = agencyData.commissionType || 'PERCENTAGE';
                    if (type === 'FIXED') {
                        commissionAmount = rate;
                        agencyNetPrice = baseAmount - rate;
                    } else {
                        commissionAmount = (baseAmount * rate) / 100;
                        agencyNetPrice = baseAmount - commissionAmount;
                    }
                } else if (labData?.defaultAgencyCommission) {
                    // Lab-level default
                    rate = Number(labData.defaultAgencyCommission);
                    type = 'PERCENTAGE';
                    commissionAmount = (baseAmount * rate) / 100;
                    agencyNetPrice = baseAmount - commissionAmount;
                }

                // Create commission record
                if (commissionAmount > 0) {
                    totalAgencyCommission += commissionAmount;
                    await tx.commission.create({
                        data: {
                            testId: ct.id,
                            agencyId: agencyData.id,
                            amount: commissionAmount,
                            type,
                            rate,
                            status: 'PENDING',
                        }
                    });
                }

                // Build B2B invoice item with the agency's net price
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

        // ==========================================
        // --- K. CREATE HIDDEN B2B AGENCY INVOICE ---
        // ==========================================
        // This invoice is visible only on the agency/B2B portal view.
        // It shows the agency's B2B rates (net prices), NOT the patient prices.
        let agencyInvoiceId: string | null = null;

        if (agencyData && agencyInvoiceItems.length > 0) {
            const agencySubtotal = agencyInvoiceItems.reduce((s, i) => s + i.total, 0);
            const agencyInvoiceNumber = `B2B-${invoiceNumber}`;

            const agencyInvoice = await tx.invoice.create({
                data: {
                    labId: user.labId,
                    branchId: user.branchId,
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
                    isB2B: true, // ✅ Hidden from main billing — only visible on agency view
                    items: { create: agencyInvoiceItems }
                }
            });
            agencyInvoiceId = agencyInvoice.id;
        }

        // ==========================================
        // --- L. UPDATE REFERRAL COUNTERS ---
        // ==========================================
        if (doctorData) {
            await tx.doctor.update({
                where: { id: doctorData.id },
                data: {
                    totalReferrals: { increment: 1 },
                    totalCommission: { increment: totalDoctorCommission },
                }
            });
        }
        if (agencyData) {
            await tx.agency.update({
                where: { id: agencyData.id },
                data: {
                    totalReferrals: { increment: 1 },
                    totalCommission: { increment: totalAgencyCommission },
                }
            });
        }

        // ==========================================
        // --- M. ACTIVITY LOG ---
        // ==========================================
        await tx.activityLog.create({
            data: {
                labId: user.labId,
                userId: user.id || user.userId,
                action: 'ACCESSION_CREATED',
                entity: 'INVOICE',
                entityType: 'INVOICE',
                entityId: invoice.id,
                description: `Accession created for ${patientData.name} — ${tests.length} tests, Invoice: ${invoiceNumber}` +
                    (doctorData ? `, Doctor: ${doctorData.name}` : '') +
                    (agencyData ? `, Agency: ${agencyData.agencyName}` : '') +
                    (totalDoctorCommission > 0 ? `, Dr Commission: ₹${totalDoctorCommission.toFixed(2)}` : '') +
                    (totalAgencyCommission > 0 ? `, Agency Commission: ₹${totalAgencyCommission.toFixed(2)}` : ''),
            }
        });

        return {
            ...invoice,
            agencyInvoiceId,
            totalDoctorCommission,
            totalAgencyCommission,
            doctorName: doctorData?.name || null,
            agencyName: agencyData?.agencyName || null,
        };
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

        // Also cancel any pending commissions for this test
        await tx.commission.updateMany({
          where: { testId, status: 'PENDING' },
          data: { status: 'CANCELLED' }
        });
      }

      const test = await tx.test.update({
        where: { id: testId, labId: user.labId },
        data: updateData,
        include: { patient: { select: { name: true } } }
      });

      await tx.activityLog.create({
        data: {
          labId: user.labId,
          userId: user.id || user.userId,
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

// =========================================================================
// 4. PUT: Settle Commissions for a Doctor or Agency
//    Body: { commissionIds: string[], transactionRef?: string }
//    Marks commissions as PAID and records the settlement.
// =========================================================================
export async function PUT(req: NextRequest) {
  try {
    const user = await getDataFromToken(req);
    if (!user || !user.labId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { commissionIds, transactionRef } = body;

    if (!commissionIds || !Array.isArray(commissionIds) || commissionIds.length === 0) {
      return NextResponse.json({ error: 'commissionIds array is required' }, { status: 400 });
    }

    // Only allow settling commissions belonging to this lab
    const commissions = await prisma.commission.findMany({
      where: {
        id: { in: commissionIds },
        status: { in: ['PENDING', 'APPROVED'] },
        test: { labId: user.labId }
      },
      include: { test: { select: { labId: true } } }
    });

    if (commissions.length === 0) {
      return NextResponse.json({ error: 'No eligible commissions found' }, { status: 404 });
    }

    // Mark them as PAID
    const result = await prisma.commission.updateMany({
      where: { id: { in: commissionIds }, status: { in: ['PENDING', 'APPROVED'] } },
      data: {
        status: 'PAID',
        paidAt: new Date(),
        transactionRef: transactionRef || null,
      }
    });

    await prisma.activityLog.create({
      data: {
        labId: user.labId,
        userId: user.id || user.userId,
        action: 'COMMISSIONS_SETTLED',
        entity: 'COMMISSION',
        entityType: 'COMMISSION',
        entityId: commissionIds.join(','),
        description: `Settled ${result.count} commission records${transactionRef ? ` (Ref: ${transactionRef})` : ''}`,
      }
    });

    return NextResponse.json({
      success: true,
      settled: result.count,
      message: `${result.count} commissions marked as PAID`
    });
  } catch (error: any) {
    console.error("SETTLE COMMISSION ERROR:", error);
    return NextResponse.json({ error: "Failed to settle commissions" }, { status: 500 });
  }
}
