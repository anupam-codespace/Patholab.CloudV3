import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getDataFromToken } from '@/lib/auth';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getDataFromToken(req);
    if (!user || !user.labId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { results, status } = await req.json(); // results = [{ parameterName, value, unit... }]

    // Transaction: Delete old results (to handle updates) & Create new ones
    await prisma.$transaction(async (tx) => {
      // 1. Clear existing results for this test
      await tx.testResultParameter.deleteMany({
        where: { testId: params.id }
      });

      // 2. Insert new results
      if (results.length > 0) {
        await tx.testResultParameter.createMany({
          data: results.map((r: any, idx: number) => ({
             testId: params.id,
             parameterName: r.parameterName,
             value: r.value,
             unit: r.unit,
             refRangeMin: parseFloat(r.refRangeMin) || null,
             refRangeMax: parseFloat(r.refRangeMax) || null,
             refRangeText: r.refRangeText,
             isAbnormal: r.isAbnormal || false,
             order: idx
          }))
        });
      }

      // 3. Update Test Status
      await tx.test.update({
        where: { id: params.id },
        data: { 
           status: status || 'IN_PROGRESS',
           completedAt: status === 'COMPLETED' ? new Date() : null
        }
      });
    });

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("Save Results Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}