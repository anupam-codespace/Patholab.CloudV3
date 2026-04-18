import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getDataFromToken } from '@/lib/auth';
import { startOfMonth, endOfMonth } from 'date-fns';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getDataFromToken(req);
    if (!user || !user.labId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status');

    // 1. Build Query Filter
    const whereCondition: any = {
      labId: user.labId,
      ...(status && status !== 'ALL' ? { status: status as any } : {}),
      OR: search ? [
        { invoiceNumber: { contains: search, mode: 'insensitive' } },
        { patient: { name: { contains: search, mode: 'insensitive' } } }
      ] : undefined
    };

    // 2. Fetch Invoices
    const invoices = await prisma.invoice.findMany({
      where: whereCondition,
      include: {
        patient: { select: { name: true } } // Fetch patient name
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    // 3. Calculate Stats (Aggregations)
    const now = new Date();
    const [totalRevenue, pending, overdue, monthly] = await Promise.all([
      // Total Revenue (Paid)
      prisma.invoice.aggregate({
        where: { labId: user.labId, status: 'PAID' },
        _sum: { grandTotal: true }
      }),
      // Pending
      prisma.invoice.aggregate({
        where: { labId: user.labId, status: 'PENDING' },
        _sum: { grandTotal: true },
        _count: true
      }),
      // Overdue (Pending & Older than 30 days)
      prisma.invoice.aggregate({
        where: { 
          labId: user.labId, 
          status: 'PENDING',
          createdAt: { lt: new Date(now.setDate(now.getDate() - 30)) } 
        },
        _sum: { grandTotal: true },
        _count: true
      }),
      // This Month Revenue
      prisma.invoice.aggregate({
        where: { 
          labId: user.labId, 
          status: 'PAID',
          createdAt: { gte: startOfMonth(new Date()), lte: endOfMonth(new Date()) }
        },
        _sum: { grandTotal: true }
      })
    ]);

    return NextResponse.json({
      invoices,
      stats: {
        totalRevenue: totalRevenue._sum.grandTotal || 0,
        pendingAmount: pending._sum.grandTotal || 0,
        pendingCount: pending._count || 0,
        overdueAmount: overdue._sum.grandTotal || 0,
        overdueCount: overdue._count || 0,
        monthlyRevenue: monthly._sum.grandTotal || 0
      }
    });

  } catch (error) {
    console.error("Fetch Invoices Error:", error);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}