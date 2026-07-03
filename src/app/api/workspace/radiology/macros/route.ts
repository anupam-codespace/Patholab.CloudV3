import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.labId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Fetch macros that belong to this lab OR are marked as global standard templates
    const macros = await prisma.radiologyMacro.findMany({
      where: {
        OR: [
          { labId: user.labId },
          { isGlobal: true }
        ]
      },
      orderBy: { title: 'asc' }
    });

    return NextResponse.json(macros);
  } catch (error) {
    console.error("Fetch Macros Error:", error);
    return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 });
  }
}