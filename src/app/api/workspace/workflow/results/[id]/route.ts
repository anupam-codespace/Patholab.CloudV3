import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getDataFromToken } from '@/lib/auth';
import { consumeReagentsForTest } from '@/lib/inventoryEngine';
import { parseISTInput } from '@/lib/timezone';

export const dynamic = 'force-dynamic';

// Helper: Match Reference Range (Backend Logic for Accuracy)
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
// GET: Fetch Worksheet / Report Data (With Unit Injection)
// =========================================================================
export async function GET(
  req: NextRequest, 
  { params }: { params: Promise<{ id: string }> } 
) {
  try {
    const user = await getDataFromToken(req);
    if (!user || !user.labId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;

    const whereCondition = id.startsWith('P-') 
      ? { patientId: id, labId: user.labId } 
      : { id: id, labId: user.labId };

    const patientData = await prisma.patient.findFirst({
      where: whereCondition,
      include: {
        lab: {
            include: {
                reportTemplates: { where: { isActive: true }, take: 1 }
            }
        }, 
        tests: {
          where: { status: { not: 'CANCELLED' } },
          orderBy: { createdAt: 'desc' }, 
          include: {
            doctor: { include: { user: true } },
            agency: true,
            sample: true,
            invoice: true,
            results: { orderBy: { id: 'asc' } },
            customResults: true, 
            testTemplate: {
              include: {
                Department: true,
                SampleType: true,
                parameters: {
                  include: { parameter: { include: { referenceRanges: true } } },
                  orderBy: { order: 'asc' }
                },
                customFields: { include: { field: true }, orderBy: { order: 'asc' } }
              }
            },
          }
        }
      }
    });

    if (!patientData) return NextResponse.json({ error: "Patient not found" }, { status: 404 });

    // --- FETCH UNITS FROM MASTER CATALOG ---
    const allParameterCodes = patientData.tests.flatMap(t => t.results.map(r => r.parameterCode));
    const uniqueCodes = [...new Set(allParameterCodes)];

    const masterParams = await prisma.labTestParameter.findMany({
      where: {
        code: { in: uniqueCodes },
        OR: [{ labId: user.labId }, { isGlobal: true }]
      },
      select: { code: true, unit: true } 
    });

    const paramUnitMap = new Map();
    masterParams.forEach(p => paramUnitMap.set(p.code, p.unit));

    // --- MAP TESTS FOR FRONTEND ---
    const mappedTests = patientData.tests.map(t => ({
      ...t,
      results: t.results.map(r => ({
         ...r,
         parameterName: r.printName || r.parameterCode,
         value: r.textValue || (r.numericValue !== null ? r.numericValue.toString() : ""),
         unit: paramUnitMap.get(r.parameterCode) || "" 
      }))
    }));
    patientData.tests = mappedTests as any;

    return NextResponse.json(patientData);

  } catch (error) {
    console.error("Fetch Error:", error);
    return NextResponse.json({ error: "Failed to load report data" }, { status: 500 });
  }
}

// =========================================================================
// POST: Save Results (HANDLES BOTH BATCH & SINGLE PAYLOADS)
// =========================================================================
export async function POST(
  req: NextRequest, 
  { params }: { params: Promise<{ id: string }> } 
) {
  try {
    const user = await getDataFromToken(req);
    if (!user || !user.labId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: targetId } = await params;
    const body = await req.json(); 

    // ==========================================================
    // BRANCH A: NEW INVOICE-LEVEL BATCH PAYLOAD
    // ==========================================================
    if (body.data && body.data.parameters) {
        const { action, data, invoiceId } = body;
        
        // ✅ ADDED: Extracted sampleCollectedAt and sampleReceivedAt for Batch
        const { parameters, notes, impressions, checkedById, approvedById, sampleCollectedAt, sampleReceivedAt } = data; 

        let newStatus = undefined;
        if (action === 'SAVE_DRAFT') newStatus = 'IN_PROGRESS';
        if (action === 'REQUEST_APPROVAL' || action === 'SUBMIT_FOR_REVIEW') newStatus = 'COMPLETED';
        if (action === 'APPROVE') newStatus = 'APPROVED';
        if (action === 'UNLOCK') newStatus = 'COMPLETED'; 

        await prisma.$transaction(async (tx) => {
            // 1. Batch Update all Parameter Results
            for (const [paramId, value] of Object.entries(parameters)) {
                const strValue = String(value);
                const parsedNumeric = parseFloat(strValue);
                const isNumeric = !isNaN(parsedNumeric) && strValue.trim() !== '';

                await tx.testResultParameter.update({
                    where: { id: paramId },
                    data: {
                        textValue: strValue,
                        numericValue: isNumeric ? parsedNumeric : null,
                    }
                });
            }

            // 2. Batch Update all Tests (Notes, Impressions, Status, Dates, and Signatures)
            const testsInInvoice = await tx.test.findMany({ 
                where: { invoiceId: invoiceId || targetId, labId: user.labId } 
            });

            for (const test of testsInInvoice) {
                const isFirstTimeCompletion = (action === 'REQUEST_APPROVAL' || action === 'APPROVE' || action === 'SUBMIT_FOR_REVIEW') && 
                                              (test.status !== 'COMPLETED' && test.status !== 'APPROVED');

                await tx.test.update({
                    where: { id: test.id },
                    data: {
                        ...(notes && notes[test.id] !== undefined ? { notes: notes[test.id] } : {}),
                        ...(impressions && impressions[test.id] !== undefined ? { impression: impressions[test.id] } : {}),
                        
                        // ✅ TIMEZONE FIX: Parse naive datetime-local strings as IST explicitly.
                        // `new Date("2026-08-31T15:30")` interprets the string in the SERVER's
                        // local timezone (UTC in our Docker env), causing a 5.5h shift.
                        // parseISTInput() always treats the input as IST (UTC+5:30).
                        ...(sampleCollectedAt && !test.sampleCollectedAt ? { sampleCollectedAt: parseISTInput(sampleCollectedAt) || undefined } : {}),
                        ...(sampleReceivedAt && !test.sampleReceivedAt ? { sampleReceivedAt: parseISTInput(sampleReceivedAt) || undefined } : {}),

                        checkedBy: checkedById || undefined,
                        approvedBy: approvedById || undefined,

                        ...(newStatus ? {
                            status: newStatus as any,
                            // ✅ Only set checkedAt/completedAt once (first time)
                            ...(newStatus === 'COMPLETED' && !test.completedAt ? { completedAt: new Date(), checkedAt: new Date() } : {}),
                            // ✅ Only set approvedAt once (first time)
                            ...(newStatus === 'APPROVED' && !test.approvedAt ? { approvedAt: new Date() } : {})
                        } : {})
                    }
                });

                // 3. Fire the Inventory Engine if transitioning to Complete/Approve
                if (isFirstTimeCompletion) {
                    try {
                        await consumeReagentsForTest(test.id, user.id || user.name || "SYSTEM");
                    } catch (err) {
                        console.error(`[Inventory Error] Test ${test.id}:`, err);
                    }
                }

                // ✅ v3.2.3: AUTO-CREATE Report record when a test is APPROVED.
                // Previously, no `prisma.report.create()` existed anywhere — so the
                // Report Dispatch page was always empty. Now we create one Report
                // per test the moment it gets APPROVED status (idempotent: skips if
                // a report already exists for this test).
                if (newStatus === 'APPROVED' && action === 'APPROVE') {
                    try {
                        const existingReport = await tx.report.findFirst({
                            where: { testId: test.id },
                            select: { id: true },
                        });
                        if (!existingReport) {
                            // Fetch patientId for the test (needed for Report.patientId)
                            const testWithPatient = await tx.test.findUnique({
                                where: { id: test.id },
                                select: { patientId: true, labId: true, branchId: true },
                            });
                            if (testWithPatient) {
                                await tx.report.create({
                                    data: {
                                        labId: testWithPatient.labId,
                                        branchId: testWithPatient.branchId || null,
                                        testId: test.id,
                                        patientId: testWithPatient.patientId,
                                        status: 'APPROVED',
                                        version: 1,
                                        isSigned: true,
                                        signedById: user.id || user.userId,
                                        signedAt: new Date(),
                                        approvedAt: new Date(),
                                    },
                                });
                            }
                        } else {
                            // Already exists — just bump status to APPROVED
                            await tx.report.update({
                                where: { id: existingReport.id },
                                data: {
                                    status: 'APPROVED',
                                    isSigned: true,
                                    signedById: user.id || user.userId,
                                    signedAt: new Date(),
                                    approvedAt: new Date(),
                                },
                            });
                        }
                    } catch (err) {
                        console.error(`[Report Auto-Create Error] Test ${test.id}:`, err);
                    }
                }
            }
        });

        return NextResponse.json({ success: true, message: "Batch update successful" });
    }

    // ==========================================================
    // BRANCH B: SINGLE-TEST PAYLOAD (From our updated frontend)
    // ==========================================================
    const { 
      testId, 
      results, 
      customResults, 
      action, 
      notes, 
      impression, 
      sampleCollectedAt, // ✅ ADDED
      sampleReceivedAt,
      checkedById, 
      approvedById 
    } = body; 
    
    if (testId && results) {
        const testContext = await prisma.test.findUnique({
            where: { id: testId }
        });

        if (!testContext) return NextResponse.json({ error: "Test not found" }, { status: 404 });

        const isFirstTimeCompletion = (action === 'SUBMIT_FOR_REVIEW' || action === 'APPROVE') && 
                                      (testContext.status !== 'COMPLETED' && testContext.status !== 'APPROVED');

        // 1. Update Core Results
        for (const res of results) {
            const parsedNumeric = parseFloat(res.value);
            const isNumeric = !isNaN(parsedNumeric) && res.value.trim() !== '';

            if (res.id) {
                await prisma.testResultParameter.update({
                    where: { id: res.id },
                    data: { 
                        numericValue: isNumeric ? parsedNumeric : null,
                        textValue: res.value, 
                    }
                });
            }
        }

        // 2. Determine Action Status
        let newStatus = undefined;
        if (action === 'SAVE_DRAFT') newStatus = 'IN_PROGRESS';
        if (action === 'SUBMIT_FOR_REVIEW') newStatus = 'COMPLETED';
        if (action === 'APPROVE') newStatus = 'APPROVED';
        if (action === 'UNLOCK') newStatus = 'COMPLETED'; 

        // 3. Update Test Record
        // ✅ v3.1: Fetch existing test to check if timestamps are already set
        const existingTest = await prisma.test.findUnique({ where: { id: testId }, select: { sampleCollectedAt: true, sampleReceivedAt: true, completedAt: true, approvedAt: true } });
        
        await prisma.test.update({
            where: { id: testId },
            data: { 
                notes: notes !== undefined ? notes : undefined,
                impression: impression !== undefined ? impression : undefined,
                
                // ✅ TIMEZONE FIX: Parse naive datetime-local strings as IST explicitly.
                ...(sampleCollectedAt && !existingTest?.sampleCollectedAt ? { sampleCollectedAt: parseISTInput(sampleCollectedAt) || undefined } : {}),
                ...(sampleReceivedAt && !existingTest?.sampleReceivedAt ? { sampleReceivedAt: parseISTInput(sampleReceivedAt) || undefined } : {}),
                
                checkedBy: checkedById || null,
                approvedBy: approvedById || null,

                ...(newStatus ? { 
                    status: newStatus as any,
                    // ✅ Only set checkedAt/completedAt/approvedAt once (first time)
                    ...(newStatus === 'COMPLETED' && !existingTest?.completedAt ? { completedAt: new Date(), checkedAt: new Date() } : {}),
                    ...(newStatus === 'APPROVED' && !existingTest?.approvedAt ? { approvedAt: new Date() } : {})
                } : {})
            }
        });

        // 4. Fire Inventory
        if (isFirstTimeCompletion) {
            consumeReagentsForTest(testId, user.id || user.name || "SYSTEM").catch(console.error);
        }

        // ✅ v3.2.3: AUTO-CREATE Report record when single test is APPROVED
        // (mirrors the batch-branch logic above)
        if (newStatus === 'APPROVED' && action === 'APPROVE') {
            try {
                const existingReport = await prisma.report.findFirst({
                    where: { testId },
                    select: { id: true },
                });
                if (!existingReport) {
                    const testWithPatient = await prisma.test.findUnique({
                        where: { id: testId },
                        select: { patientId: true, labId: true, branchId: true },
                    });
                    if (testWithPatient) {
                        await prisma.report.create({
                            data: {
                                labId: testWithPatient.labId,
                                branchId: testWithPatient.branchId || null,
                                testId,
                                patientId: testWithPatient.patientId,
                                status: 'APPROVED',
                                version: 1,
                                isSigned: true,
                                signedById: user.id || user.userId,
                                signedAt: new Date(),
                                approvedAt: new Date(),
                            },
                        });
                    }
                } else {
                    await prisma.report.update({
                        where: { id: existingReport.id },
                        data: {
                            status: 'APPROVED',
                            isSigned: true,
                            signedById: user.id || user.userId,
                            signedAt: new Date(),
                            approvedAt: new Date(),
                        },
                    });
                }
            } catch (err) {
                console.error(`[Report Auto-Create Error] Test ${testId}:`, err);
            }
        }

        return NextResponse.json({ success: true, message: "Test update successful" });
    }

    return NextResponse.json({ error: "Invalid payload format" }, { status: 400 });

  } catch (error: any) {
    console.error("Save Error:", error);
    return NextResponse.json({ error: "Failed to save results" }, { status: 500 });
  }
}