import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getDataFromToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getDataFromToken(req);
    if (!user || !user.labId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';

    // Fetch active Bundles and Single Tests
    const templates = await prisma.testTemplate.findMany({
      where: {
        isActive: true,
        OR: search ? [
          { name: { contains: search, mode: 'insensitive' } },
          { code: { contains: search, mode: 'insensitive' } }
        ] : undefined,
      },
      orderBy: { name: 'asc' },
      include: { category: true }
    });

    return NextResponse.json(templates);

  } catch (error) {
    return NextResponse.json([], { status: 500 });
  }
}