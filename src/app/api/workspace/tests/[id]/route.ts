import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getDataFromToken } from '@/lib/auth';

// GET: Fetch Single Test Details (with Results & Patient)
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getDataFromToken(req);
    if (!user || !user.labId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const test = await prisma.test.findUnique({
      where: { id: params.id, labId: user.labId },
      include: {
        patient: true,
        doctor: { include: { user: true } },
        results: { orderBy: { order: 'asc' } }, // Fetch existing results
        category: true
      }
    });

    if (!test) return NextResponse.json({ error: 'Test not found' }, { status: 404 });

    // ⚡ SMART LOGIC: If no results exist yet, try to fetch template defaults
    let parameters = test.results;
    if (parameters.length === 0) {
       const template = await prisma.testTemplate.findUnique({
          where: { code: test.testCode }
       });
       // If template exists and has reference data, use it to scaffold the form
       if (template && template.referenceData) {
          // Assuming referenceData is stored as: [{ name: 'Hemoglobin', unit: 'g/dL', min: 12, max: 16 }]
          const refs = template.referenceData as any[]; 
          parameters = refs.map((ref, idx) => ({
             id: `temp-${idx}`, // Temp ID for frontend
             testId: test.id,
             parameterName: ref.name,
             value: '',
             unit: ref.unit,
             refRangeMin: ref.min,
             refRangeMax: ref.max,
             refRangeText: `${ref.min} - ${ref.max}`,
             isAbnormal: false,
             isCritical: false,
             order: idx,
             entryMethod: 'MANUAL',
             analyzerId: null
          }));
       }
    }

    return NextResponse.json({ ...test, results: parameters });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH: Update Status or Edit Details
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getDataFromToken(req);
    if (!user || !user.labId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();

    const updatedTest = await prisma.test.update({
      where: { id: params.id, labId: user.labId },
      data: {
        status: body.status, // e.g., 'COMPLETED'
        testName: body.testName,
        price: body.price ? parseFloat(body.price) : undefined,
        completedAt: body.status === 'COMPLETED' ? new Date() : undefined,
        // Add other fields you want to allow editing
      }
    });

    return NextResponse.json(updatedTest);

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}