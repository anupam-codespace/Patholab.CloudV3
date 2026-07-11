export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDataFromToken } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const user = await getDataFromToken(req);

    if (!user || !user.labId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const tests = await prisma.test.findMany({
      where: {
        labId: user.labId,

        status: {
          in: [
            "COMPLETED",
            "APPROVED",
          ],
        },
      },

      include: {
        patient: true,

        results: {
          orderBy: {
            order: "asc",
          },
        },
      },

      orderBy: {
        updatedAt: "desc",
      },
    });

    const reports = tests.map((test) => ({
      // Important:
      // id is the TEST ID because generator
      // already knows how to fetch Test by ID
      id: test.id,

      testId: test.id,

      version: 1,

      status: test.status,

      pdfUrl: test.reportUrl || null,

      isAmended: false,

      amendmentReason: null,

      createdAt: test.updatedAt.toISOString(),

      testName: test.testName,

      patient: {
        name:
          test.patient?.name ||
          "Unknown Patient",

        phone:
          test.patient?.phone ||
          "",

        email:
          test.patient?.email ||
          null,
      },
    }));

    return NextResponse.json({
      success: true,
      reports,
    });
  } catch (error) {
    console.error(
      "[CLINICAL_REPORTS_FETCH_ERROR]",
      error
    );

    return NextResponse.json(
      {
        error: "Failed to fetch clinical reports",
      },
      {
        status: 500,
      }
    );
  }
}