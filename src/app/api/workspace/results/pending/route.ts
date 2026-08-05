import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDataFromToken } from "@/lib/auth";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getDataFromToken(req);
    if (!user || !user.labId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Fetch tests that are PENDING or IN_PROGRESS
    const tests = await prisma.test.findMany({
      where: {
        labId: user.labId,
        status: { in: ['PENDING', 'SAMPLE_COLLECTED', 'IN_PROGRESS'] }
      },
      include: {
        patient: { select: { name: true, age: true, gender: true } },
        results: {
          orderBy: { order: 'asc' }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    return NextResponse.json({ tests }, { status: 200 });
  } catch (error) {
    console.error("Fetch Pending Results Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}