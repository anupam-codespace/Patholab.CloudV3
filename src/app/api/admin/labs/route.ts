import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Schema for updating lab status
const updateStatusSchema = z.object({
  labId: z.string(),
  isActive: z.boolean(),
});

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status'); // 'active' | 'inactive' | 'all'
    
    const skip = (page - 1) * limit;

    // Build Query
    const whereClause: any = {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { licenseNumber: { contains: search, mode: 'insensitive' } },
        { owner: { email: { contains: search, mode: 'insensitive' } } },
      ]
    };

    if (status && status !== 'all') {
      whereClause.isActive = status === 'active';
    }

    // 1. Fetch Data
    const [labs, total] = await Promise.all([
      prisma.lab.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          owner: { select: { name: true, email: true, phone: true } },
          subscription: { include: { plan: true } },
          _count: {
            select: {
              tests: true,
              patients: true,
              staff: true
            }
          }
        }
      }),
      prisma.lab.count({ where: whereClause })
    ]);

    // 2. Fetch Stats Headers (Only on first page load to save resources)
    let stats = null;
    if (page === 1 && !search) {
      const [totalLabs, activeLabs, totalRevenue] = await Promise.all([
        prisma.lab.count(),
        prisma.lab.count({ where: { isActive: true } }),
        prisma.payment.aggregate({ where: { status: 'SUCCESS' }, _sum: { amount: true } })
      ]);
      stats = { totalLabs, activeLabs, totalRevenue: totalRevenue._sum.amount || 0 };
    }

    return NextResponse.json({
      data: labs,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      },
      stats
    });

  } catch (error) {
    console.error('Labs API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// TOGGLE STATUS API
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { labId, isActive } = updateStatusSchema.parse(body);

    const lab = await prisma.lab.update({
      where: { id: labId },
      data: { isActive },
    });

    return NextResponse.json({ message: 'Status updated', lab });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update' }, { status: 400 });
  }
}