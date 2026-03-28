import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user?.labId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Standard Lab Containers
    const containers = [
      { name: 'Lavender Top (EDTA)', code: 'EDTA', capColor: '#A855F7' }, // Purple
      { name: 'Red Top (Serum)',     code: 'SERUM', capColor: '#EF4444' }, // Red
      { name: 'Grey Top (Glucose)',  code: 'FLUOR', capColor: '#6B7280' }, // Grey
      { name: 'Blue Top (Citrate)',  code: 'CITR',  capColor: '#3B82F6' }, // Blue
      { name: 'Yellow Top (SST)',    code: 'SST',   capColor: '#EAB308' }, // Yellow
      { name: 'Urine Container',     code: 'URINE', capColor: '#F59E0B' }, // Orange
    ];

    let createdCount = 0;

    for (const c of containers) {
      // Check if exists to avoid duplicates
      const exists = await prisma.containerType.findFirst({
        where: { labId: user.labId, code: c.code }
      });

      if (!exists) {
        await prisma.containerType.create({
          data: {
            labId: user.labId,
            name: c.name,
            code: c.code,
            capColor: c.capColor
          }
        });
        createdCount++;
      }
    }

    return NextResponse.json({ 
        success: true, 
        message: `Seeding Complete. Added ${createdCount} new container types.` 
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}