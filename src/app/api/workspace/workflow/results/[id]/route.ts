import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getDataFromToken } from '@/lib/auth';
import { consumeReagentsForTest } from '@/lib/inventoryEngine'; // ✅ 1. IMPORT THE ENGINE

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

// GET: Fetch Worksheet / Report Data
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
            sample: true,
            results: { orderBy: { id: 'asc' } },
            customResults: true, 
            testTemplate: {
              include: {
                sampleType: true,
                parameters: {
                  include: { parameter: { include: { referenceRanges: true } } },
                  orderBy: { order: 'asc' }
                },
                customFields: { include: { fieldDef: true }, orderBy: { order: 'asc' } }
              }
            },
          }
        }
      }
    });

    if (!patientData) return NextResponse.json({ error: "Patient not found" }, { status: 404 });

    // Hydrate Single Parameter Tests
    const singleParameterTests = patientData.tests.filter(t => !t.testTemplate || t.testTemplate.parameters.length === 0);
    
    if (singleParameterTests.length > 0) {
        const codes = singleParameterTests.map(t => t.testCode);
        const masterParams = await prisma.labTestParameter.findMany({
            where: { labId: user.labId, code: { in: codes } },
            include: { referenceRanges: true }
        });

        singleParameterTests.forEach(test => {
            const match = masterParams.find(mp => mp.code === test.testCode);
            if (match) {
                test.testTemplate = {
                    ...test.testTemplate, 
                    parameters: [{
                        parameter: match,
                        order: 0,
                        id: 'virtual-id', 
                        templateId: 'virtual-template',
                        parameterId: match.id,
                        headingId: null,
                        customLabel: null
                    }]
                } as any;
            }
        });
    }

    return NextResponse.json(patientData);

  } catch (error) {
    console.error("Fetch Error:", error);
    return NextResponse.json({ error: "Failed to load report data" }, { status: 500 });
  }
}

// POST: Save Results (Enhanced with Usage Tracking)
export async function POST(
  req: NextRequest, 
  { params }: { params: Promise<{ id: string }> } 
) {
  try {
    const user = await getDataFromToken(req);
    if (!user || !user.labId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params; 
    const { testId, results, customResults, action, notes, impression, sampleReceivedAt } = await req.json(); 

    // 1. Fetch Test Context (Needed for Reference Ranges AND Status Check)
    const testContext = await prisma.test.findUnique({
        where: { id: testId },
        include: {
            patient: true,
            testTemplate: {
                include: {
                    parameters: {
                        include: { parameter: { include: { referenceRanges: true } } }
                    }
                }
            }
        }
    });

    if (!testContext) return NextResponse.json({ error: "Test not found" }, { status: 404 });

    // ✅ 2. Identify if this is the FIRST time completing/approving to prevent double-deduction
    const isFirstTimeCompletion = (action === 'SUBMIT_FOR_REVIEW' || action === 'APPROVE') && 
                                  (testContext.status !== 'COMPLETED' && testContext.status !== 'APPROVED');

    // ============================================================
    // ✅ USAGE TRACKING LOGIC
    // ============================================================
    if (isFirstTimeCompletion) {
        const subscription = await prisma.subscription.findUnique({
            where: { labId: user.labId },
            select: { id: true } 
        });

        if (subscription) {
            await prisma.currentUsage.update({
                where: { subscriptionId: subscription.id },
                data: { testsUsed: { increment: 1 } }
            });
        }
    }

    // 3. Save Standard Results
    if (results && results.length > 0) {
        for (const res of results) {
            let masterParam = testContext.testTemplate?.parameters.find(
                (p) => p.parameter.name === res.parameterName
            )?.parameter;

            if (!masterParam) {
                masterParam = await prisma.labTestParameter.findFirst({
                    where: { labId: user.labId, name: res.parameterName },
                    include: { referenceRanges: true }
                }) as any;
            }

            let snapshot = { min: null, max: null, text: null };
            
            if (masterParam) {
                const range = getMatchingRange(masterParam, testContext.patient);
                if (range) {
                    snapshot = {
                        min: range.lowValue,
                        max: range.highValue,
                        text: range.textValue || (range.customLabel ? `${range.customLabel}: ${range.lowValue}-${range.highValue}` : null)
                    };
                }
            }

            await prisma.testResultParameter.upsert({
                where: { id: res.id || "new-entry" },
                update: { 
                    value: res.value, 
                    isAbnormal: res.isAbnormal, 
                    isCritical: res.isCritical,
                    refRangeMin: snapshot.min,
                    refRangeMax: snapshot.max,
                    refRangeText: snapshot.text
                },
                create: {
                    testId: testId,
                    parameterName: res.parameterName,
                    value: res.value,
                    unit: res.unit || masterParam?.unit, 
                    isAbnormal: res.isAbnormal,
                    isCritical: res.isCritical,
                    refRangeMin: snapshot.min,
                    refRangeMax: snapshot.max,
                    refRangeText: snapshot.text
                }
            });
        }
    }

    // 4. Save Custom Fields
    if (customResults && customResults.length > 0) {
        for (const item of customResults) {
           await prisma.testResultCustomField.upsert({
              where: { testId_fieldDefId: { testId: testId, fieldDefId: item.fieldDefId } },
              update: { value: item.value, ...(item.layout ? { layout: item.layout } : {}) },
              create: { testId: testId, fieldDefId: item.fieldDefId, value: item.value, layout: item.layout ?? undefined }
           });
        }
    }

    // 5. Update Status & Meta Data
    let newStatus = undefined;
    if (action === 'SUBMIT_FOR_REVIEW') newStatus = 'COMPLETED';
    if (action === 'APPROVE') newStatus = 'APPROVED';

    if (action || notes !== undefined || impression !== undefined || sampleReceivedAt) {
        await prisma.test.update({
            where: { id: testId },
            data: { 
                notes: notes !== undefined ? notes : undefined,
                impression: impression !== undefined ? impression : undefined,
                sampleReceivedAt: sampleReceivedAt ? new Date(sampleReceivedAt) : undefined,
                ...(newStatus ? { 
                    status: newStatus as any,
                    ...(newStatus === 'APPROVED' ? { approvedAt: new Date(), approvedBy: user.name } : {})
                } : {})
            }
        });
    }

    // ============================================================
    // ✅ 6. FIRE THE INVENTORY ENGINE
    // ============================================================
    if (isFirstTimeCompletion) {
        // Fire it asynchronously so it doesn't hold up the UI response
        consumeReagentsForTest(testId, user.id || user.name || "SYSTEM")
            .then(res => console.log("[Inventory Trigger]", res))
            .catch(err => console.error("[Inventory Trigger Error]", err));
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("Save Error:", error);
    return NextResponse.json({ error: "Failed to save results" }, { status: 500 });
  }
}