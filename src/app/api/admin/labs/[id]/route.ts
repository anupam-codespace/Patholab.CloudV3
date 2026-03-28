import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { startOfYear } from 'date-fns';

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const labId = params.id;

    // 1. Fetch Core Data with Relations
    const lab = await prisma.lab.findUnique({
      where: { id: labId },
      include: {
        owner: {
          select: { id: true, name: true, email: true, phone: true, createdAt: true }
        },
        subscription: {
          include: { plan: true, payments: { take: 5, orderBy: { createdAt: 'desc' } } }
        },
        staff: {
          include: { user: { select: { name: true, email: true, role: true, avatar: true } } }
        },
        _count: {
          select: { tests: true, patients: true, staff: true }
        }
      }
    });

    if (!lab) {
      return NextResponse.json({ error: 'Lab not found' }, { status: 404 });
    }

    // 2. Aggregate Revenue History (Last 12 Months)
    const revenueDataRaw = await prisma.payment.groupBy({
      by: ['createdAt'],
      where: {
        subscription: { labId: labId },
        status: 'SUCCESS',
        createdAt: { gte: startOfYear(new Date()) }
      },
      _sum: { amount: true }
    });

    // Simplify graph data for frontend
    const revenueGraph = revenueDataRaw.map(r => ({
      date: r.createdAt.toISOString().split('T')[0],
      amount: r._sum.amount || 0
    }));

    // 3. Calculate Total Lifetime Revenue
    const totalRevenue = await prisma.payment.aggregate({
      where: { subscription: { labId: labId }, status: 'SUCCESS' },
      _sum: { amount: true }
    });

    return NextResponse.json({
      ...lab,
      stats: {
        revenueGraph,
        totalRevenue: totalRevenue._sum.amount || 0
      }
    });

  } catch (error) {
    console.error('Lab Detail API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}