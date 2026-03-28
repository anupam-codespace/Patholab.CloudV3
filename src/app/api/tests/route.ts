import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getDataFromToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getDataFromToken(req);
    if (!user || !user.labId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'ALL';

    // 1. Build Filter
    const whereClause: any = {
      labId: user.labId,
      ...(status !== 'ALL' && { status: status as any }),
      OR: search ? [
        { testNumber: { contains: search, mode: 'insensitive' } },
        { patient: { name: { contains: search, mode: 'insensitive' } } },
        { patient: { phone: { contains: search, mode: 'insensitive' } } },
      ] : undefined
    };

    // 2. Fetch Data
    const [tests, total] = await Promise.all([
      prisma.test.findMany({
        where: whereClause,
        take: limit,
        skip: (page - 1) * limit,
        orderBy: { createdAt: 'desc' },
        include: {
          patient: { select: { id: true, name: true, phone: true, gender: true, age: true, patientId: true } },
          doctor: { select: { name: true } }, // Referral
          // If you have a sample relation, include it here
          // samples: { select: { collectedAt: true, collectedBy: true, location: true } } 
        }
      }),
      prisma.test.count({ where: whereClause })
    ]);

    // 3. Format Response
    const formattedTests = tests.map(t => ({
      id: t.id,
      testNumber: t.testNumber,
      testName: t.testName,
      code: t.testCode,
      price: t.finalPrice,
      status: t.status,
      priority: t.priority,
      createdAt: t.createdAt,
      reportUrl: t.reportUrl,
      
      patient: {
        id: t.patient.id,
        name: t.patient.name,
        details: `${t.patient.gender?.charAt(0)} / ${t.patient.age}`,
        phone: t.patient.phone,
        pid: t.patient.patientId
      },
      
      // Mocking sample data if not in your schema yet, or map from t.samples
      collection: {
        by: 'Phlebo A.',
        at: t.sampleCollectedAt || t.createdAt,
        location: 'Home Collection' 
      },
      
      refBy: t.doctor?.name || 'Self'
    }));

    return NextResponse.json({
      data: formattedTests,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}