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
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const invoiceId = params.invoiceId;
    const body = await req.json();

    const { action, data } = body;

    const parameters = data?.parameters || {};
    const notes = data?.notes || {};
    const impressions = data?.impressions || {};

    // 1. Map UI action → Test status
    let targetStatus: any = "IN_PROGRESS";

    if (action === "SAVE_DRAFT") {
      targetStatus = "IN_PROGRESS";
    }

    if (action === "REQUEST_APPROVAL") {
      targetStatus = "COMPLETED";
    }

    if (action === "APPROVE") {
      targetStatus = "APPROVED";
    }

    // 2. Get ALL clinical tests from this invoice
    const invoiceTests = await prisma.test.findMany({
      where: {
        invoiceId,
        labId: user.labId,
      },
      select: {
        id: true,
      },
    });

    if (invoiceTests.length === 0) {
      return NextResponse.json(
        { error: "No tests found for this invoice" },
        { status: 404 }
      );
    }

    // 3. Update result parameters
    const parameterUpdates = Object.entries(parameters).map(
      ([paramId, val]) => {
        const stringValue = String(val ?? "");
        const numValue = parseFloat(stringValue);

        return prisma.testResultParameter.update({
          where: {
            id: paramId,
          },
          data: {
            textValue: stringValue,
            numericValue: isNaN(numValue)
              ? null
              : numValue,
          },
        });
      }
    );

    // 4. Update EVERY test belonging to invoice
    const testUpdates = invoiceTests.map((test) =>
      prisma.test.update({
        where: {
          id: test.id,
        },
        data: {
          notes: notes[test.id] || null,

          impression:
            impressions[test.id] || null,

          status: targetStatus,

          approvedBy:
            action === "APPROVE"
              ? user.id
              : undefined,

          approvedAt:
            action === "APPROVE"
              ? new Date()
              : undefined,
        },
      })
    );

    // 5. Execute safely
    await prisma.$transaction([
      ...parameterUpdates,
      ...testUpdates,
    ]);

    return NextResponse.json({
      success: true,
      message: "Results saved successfully",
      status: targetStatus,
      updatedTests: invoiceTests.length,
    });
  } catch (error) {
    console.error("[RESULTS_SAVE_ERROR]", error);

    return NextResponse.json(
      {
        error: "Internal Server Error",
      },
      {
        status: 500,
      }
    );
  }
}