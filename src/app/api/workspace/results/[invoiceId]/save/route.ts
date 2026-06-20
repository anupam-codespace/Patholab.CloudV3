import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: { invoiceId: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.labId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const invoiceId = params.invoiceId;
    const body = await req.json();
    const { action, data } = body;
    const { parameters, notes, impressions } = data;

    // 1. Map the UI action to your database TestStatus enum
    let targetStatus: any = "IN_PROGRESS"; // Default for SAVE_DRAFT
    if (action === "REQUEST_APPROVAL") targetStatus = "COMPLETED";
    if (action === "APPROVE") targetStatus = "APPROVED";

    // 2. Prepare all the parameter update promises
    const updatePromises: any[] = [];

    // Update individual result parameters
    for (const [paramId, val] of Object.entries(parameters)) {
      const stringValue = val as string;
      const numValue = parseFloat(stringValue);
      
      updatePromises.push(
        prisma.testResultParameter.update({
          where: { id: paramId },
          data: {
            textValue: stringValue,
            numericValue: isNaN(numValue) ? null : numValue,
          },
        })
      );
    }

    // 3. Update the parent Tests (Notes, Impressions, and Status)
    // We get the unique test IDs from the notes/impressions payload
    const testIds = new Set([
      ...Object.keys(notes || {}),
      ...Object.keys(impressions || {})
    ]);

    for (const testId of Array.from(testIds)) {
      updatePromises.push(
        prisma.test.update({
          where: { id: testId },
          data: {
            notes: notes[testId] || null,
            impression: impressions[testId] || null,
            status: targetStatus,
            // If approving, log who approved it and when
            approvedBy: action === "APPROVE" ? user.id : undefined,
            approvedAt: action === "APPROVE" ? new Date() : undefined,
          },
        })
      );
    }

    // 4. Execute everything in a single, safe transaction
    await prisma.$transaction(updatePromises);

    return NextResponse.json({ message: "Results saved successfully" });
  } catch (error) {
    console.error("[RESULTS_SAVE_ERROR]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}