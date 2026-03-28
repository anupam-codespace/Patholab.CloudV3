import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user?.labId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Fetch active tests for this lab
    // Since TestTemplate links to Department, and Department links to Lab, we filter by Department's Lab ID
    const tests = await prisma.testTemplate.findMany({
      where: {
        isActive: true,
        department: {
          labId: user.labId
        }
      },
      select: {
        id: true,
        name: true,
        code: true,
        price: true,
        type: true,
        tat: true,
        sampleType: {
          select: { name: true }
        },
        department: {
          select: { name: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    return NextResponse.json(tests);
  } catch (error) {
    console.error('Fetch catalog error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}