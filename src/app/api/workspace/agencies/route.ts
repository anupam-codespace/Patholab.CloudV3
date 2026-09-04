import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getDataFromToken, getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const userFromToken = await getDataFromToken(req);
    const currentUser = await getCurrentUser();
    const user = userFromToken || currentUser;

    let labId = user?.labId;
    if (!labId && user && (user.userId || user.id)) {
      const uid = user.userId || user.id;
      const dbUser = await prisma.user.findUnique({
        where: { id: uid },
        include: {
          lab: true,
          staffLabs: { include: { lab: true } }
        }
      });
      const activeLab = dbUser?.lab || dbUser?.staffLabs?.[0]?.lab;
      if (activeLab) labId = activeLab.id;
    }

    if (!labId) {
      return NextResponse.json({ error: 'Unauthorized or no lab assigned' }, { status: 401 });
    }

    const agencies = await prisma.agency.findMany({
      where: { labId, isActive: true },
      orderBy: { agencyName: 'asc' },
      select: {
        id: true,
        agencyName: true,
        agencyTier: true,
        contactPerson: true,
        phone: true,
        email: true
      }
    });

    const mapped = agencies.map(a => ({
      ...a,
      code: a.agencyTier || 'AGENCY'
    }));

    return NextResponse.json(mapped, { status: 200 });
  } catch (error: any) {
    console.error('[AGENCIES_GET_ERROR]', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}

