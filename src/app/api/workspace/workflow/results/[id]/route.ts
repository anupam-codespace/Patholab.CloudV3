import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getDataFromToken } from '@/lib/auth';
import { consumeReagentsForTest } from '@/lib/inventoryEngine'; 

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
// GET: Fetch Worksheet / Report Data (With Unit Injection & Multi-ID Support)
// =========================================================================
export async function GET(
  req: NextRequest, 
  { params }: { params: Promise<{ id: string }> } 
) {
  try {
    const user = await getDataFromToken(req);
    if (!user || !user.labId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: rawId } = await params;
    const decodedId = decodeURIComponent(rawId).trim();
    // Normalize cleanId by stripping common prefixes such as rep_, REP_, inv_, INV_, reg-, REG-
    const cleanId = decodedId.replace(/^(rep_|REP_|inv_|INV_|reg-|REG-|p-|P-)/i, '').trim();

    const patientInclude = {
      lab: {
        include: {
          reportTemplates: { where: { isActive: true }, take: 1 }
        }
      }, 
      tests: {
        where: { status: { not: 'CANCELLED' } },
        orderBy: { createdAt: 'desc' as const }, 
        include: {
          doctor: { include: { user: true } },
          agency: true,
          sample: true,
          invoice: true,
          results: { orderBy: { id: 'asc' as const } },
          customResults: true, 
          testTemplate: {
            include: {
              Department: true,
              SampleType: true,
              parameters: {
                include: { parameter: { include: { referenceRanges: true } } },
                orderBy: { order: 'asc' as const }
              },
              customFields: { include: { field: true }, orderBy: { order: 'asc' as const } }
            }
          },
        }
      }
    };

    // 1. Try finding patient directly by id, patientId, or clean variants
    let patientData = await prisma.patient.findFirst({
      where: {
        OR: [
          { id: decodedId },
          { id: cleanId },
          { patientId: decodedId },
          { patientId: cleanId },
          { patientId: `P-${cleanId}` },
          { patientId: `PAT-${cleanId}` },
        ],
        labId: user.labId
      },
      include: patientInclude
    });

    // 2. Try through Invoice if not found
    if (!patientData) {
      const matchingInvoice = await prisma.invoice.findFirst({
        where: {
          OR: [
            { invoiceNumber: decodedId },
            { invoiceNumber: cleanId },
            { id: decodedId },
            { id: cleanId },
          ],
          labId: user.labId
        },
        select: { patientId: true }
      });

      if (matchingInvoice?.patientId) {
        patientData = await prisma.patient.findFirst({
          where: { id: matchingInvoice.patientId, labId: user.labId },
          include: patientInclude
        });
      }
    }

    // 3. Try through Test if not found
    if (!patientData) {
      const matchingTest = await prisma.test.findFirst({
        where: {
          OR: [
            { id: decodedId },
            { id: cleanId },
            { testNumber: decodedId },
            { testNumber: cleanId },
          ],
          labId: user.labId
        },
        select: { patientId: true }
      });

      if (matchingTest?.patientId) {
        patientData = await prisma.patient.findFirst({
          where: { id: matchingTest.patientId, labId: user.labId },
          include: patientInclude
        });
      }
    }

    // 4. Try through Report if not found
    if (!patientData) {
      const matchingReport = await prisma.report.findFirst({
        where: {
          OR: [
            { id: decodedId },
            { id: cleanId },
          ],
          labId: user.labId
        },
        select: { patientId: true }
      });

      if (matchingReport?.patientId) {
        patientData = await prisma.patient.findFirst({
          where: { id: matchingReport.patientId, labId: user.labId },
          include: patientInclude
        });
      }
    }

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
    const mappedTests = patientData.tests.map(t => {
      let formattedResults = t.results.map(r => ({
         ...r,
         // The frontend maps data using "parameterName" and "value"
         parameterName: r.printName || r.parameterCode,
         value: r.textValue || (r.numericValue !== null ? r.numericValue.toString() : ""),
         // Inject the missing unit so the PDF Report displays it!
         unit: paramUnitMap.get(r.parameterCode) || "" 
      }));

      // If test has no results entered yet, populate default rows from template so report is not empty
      if (formattedResults.length === 0 && t.testTemplate?.parameters?.length) {
        formattedResults = t.testTemplate.parameters.map((tp: any) => ({
          id: `tpl-${tp.id}`,
          parameterCode: tp.parameter?.code || `param_${tp.id}`,
          parameterName: tp.parameter?.name || tp.parameter?.code || "Investigation",
          value: t.status === "APPROVED" || t.status === "COMPLETED" ? "-" : "Pending",
          unit: tp.parameter?.unit || "",
          refRangeMin: tp.parameter?.referenceRanges?.[0]?.minAge ?? null,
          refRangeMax: tp.parameter?.referenceRanges?.[0]?.maxAge ?? null,
          referenceRangeText: tp.parameter?.referenceRanges?.[0] ? 
            `${tp.parameter.referenceRanges[0].minAge ?? ''} - ${tp.parameter.referenceRanges[0].maxAge ?? ''}` : "-"
        }));
      }

      return {
        ...t,
        results: formattedResults
      };
    });
    patientData.tests = mappedTests as any;

    return NextResponse.json(patientData);

  } catch (error) {
    console.error("Fetch Error:", error);
    return NextResponse.json({ error: "Failed to load report data" }, { status: 500 });
  }
}

// =========================================================================
// POST: Save Results (BATCH PROCESSING FOR ENTIRE INVOICE)
// =========================================================================
export async function POST(
  req: NextRequest, 
  { params }: { params: Promise<{ id: string }> } 
) {
  try {
    const user = await getDataFromToken(req);
    if (!user || !user.labId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: targetId } = await params; // Could be invoiceId or testId depending on the caller
    const body = await req.json(); 

    // --- HANDLE NEW INVOICE-LEVEL BATCH PAYLOAD ---
    if (body.data && body.data.parameters) {
        const { action, data, invoiceId } = body;
        const { parameters, notes, impressions } = data;

        let newStatus = undefined;
        if (action === 'SAVE_DRAFT') newStatus = 'IN_PROGRESS';
        if (action === 'REQUEST_APPROVAL') newStatus = 'COMPLETED';
        if (action === 'APPROVE') newStatus = 'APPROVED';

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

            // 2. Batch Update all Tests (Notes, Impressions, and Status)
            const testsInInvoice = await tx.test.findMany({ 
                where: { invoiceId: invoiceId || targetId, labId: user.labId } 
            });

            for (const test of testsInInvoice) {
                const isFirstTimeCompletion = (action === 'REQUEST_APPROVAL' || action === 'APPROVE') && 
                                              (test.status !== 'COMPLETED' && test.status !== 'APPROVED');

                await tx.test.update({
                    where: { id: test.id },
                    data: {
                        // Safely apply notes and impressions if provided for this test
                        ...(notes && notes[test.id] !== undefined ? { notes: notes[test.id] } : {}),
                        ...(impressions && impressions[test.id] !== undefined ? { impression: impressions[test.id] } : {}),
                        
                        ...(newStatus ? { 
                            status: newStatus as any,
                            ...(newStatus === 'APPROVED' ? { approvedAt: new Date(), approvedBy: user.name } : {})
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
            }
        });

        return NextResponse.json({ success: true, message: "Batch update successful" });
    }

    // --- HANDLE OLD SINGLE-TEST PAYLOAD (Fallback for safety) ---
    const { testId, results, action, notes, impression, sampleReceivedAt } = body; 
    
    if (testId && results) {
        const testContext = await prisma.test.findUnique({
            where: { id: testId }
        });

        if (!testContext) return NextResponse.json({ error: "Test not found" }, { status: 404 });

        const isFirstTimeCompletion = (action === 'SUBMIT_FOR_REVIEW' || action === 'APPROVE') && 
                                      (testContext.status !== 'COMPLETED' && testContext.status !== 'APPROVED');

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

        let newStatus = undefined;
        if (action === 'SUBMIT_FOR_REVIEW') newStatus = 'COMPLETED';
        if (action === 'APPROVE') newStatus = 'APPROVED';

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

        if (isFirstTimeCompletion) {
            consumeReagentsForTest(testId, user.id || user.name || "SYSTEM").catch(console.error);
        }

        return NextResponse.json({ success: true, message: "Single test update successful" });
    }

    return NextResponse.json({ error: "Invalid payload format" }, { status: 400 });

  } catch (error: any) {
    console.error("Save Error:", error);
    return NextResponse.json({ error: "Failed to save results" }, { status: 500 });
  }
}