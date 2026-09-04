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

    // Standard default options matching web
    const collectors: Array<{ id: string; name: string }> = [
      { id: "Lab Phlebotomist", name: "Lab Phlebotomist" },
      { id: "Home Collection Agent", name: "Home Collection Agent" },
      { id: "Self", name: "Self (Patient)" },
    ];

    // Fetch user's custom lab staff / phlebotomists
    const staffList = await prisma.labStaff.findMany({
      where: { labId, isActive: true },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            role: true,
            isActive: true
          }
        }
      },
      orderBy: { joinDate: 'desc' }
    });

    for (const staff of staffList) {
      if (staff.user && staff.user.name && staff.user.isActive !== false) {
        const staffName = staff.user.name.trim();
        const roleLabel = staff.user.role ? ` (${staff.user.role})` : '';
        // Avoid duplicate names
        if (!collectors.some(c => c.name.toLowerCase() === staffName.toLowerCase() || c.id.toLowerCase() === staffName.toLowerCase())) {
          collectors.push({
            id: staffName,
            name: staffName + roleLabel
          });
        }
      }
    }

    return NextResponse.json(collectors, { status: 200 });
  } catch (error: any) {
    console.error('[COLLECTORS_GET_ERROR]', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
