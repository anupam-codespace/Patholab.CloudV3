import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';

export async function GET(req: NextRequest, { params }: { params: { sampleId: string } }) {
  const token = cookies().get('token')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  const payload = await verifyToken(token);
  if (!payload?.labId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sample = await prisma.sample.findFirst({
    where: { sampleId: params.sampleId, labId: payload.labId as string },
    include: {
      tests: {
        include: { results: { select: { id: true, parameterName: true } } }
      }
    }
  });

  if (!sample) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Flatten the tests -> results into a simple array for the UI
  const flatParams = sample.tests.flatMap(t => 
    t.results.map(r => ({
      id: r.id,
      name: r.parameterName,
      testName: t.testName
    }))
  );

  return NextResponse.json({ parameters: flatParams });
}