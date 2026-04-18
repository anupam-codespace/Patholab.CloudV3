import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user?.labId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const parameters = await prisma.labTestParameter.findMany({
      where: { 
        labId: user.labId,
        isActive: true 
      },
      select: {
        id: true,
        name: true,
        code: true,
        price: true, // ✅ Fetch the real price from DB
      },
      orderBy: { name: 'asc' }
    });

    const formatted = parameters.map(p => ({
        id: p.id,
        name: p.name,
        code: p.code,
        price: p.price || 0, // Use DB price
        type: 'PARAMETER',
        tat: 'N/A',
        sampleType: { name: 'N/A' } 
    }));

    return NextResponse.json(formatted);

  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch parameters" }, { status: 500 });
  }
}