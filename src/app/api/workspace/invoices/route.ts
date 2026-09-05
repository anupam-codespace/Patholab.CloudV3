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
    const rawInvoices = await prisma.invoice.findMany({
      where: whereCondition,
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            phone: true,
            age: true,
            ageUnit: true,
            gender: true
          }
        },
        items: {
          select: {
            id: true,
            description: true,
            unitPrice: true,
            quantity: true,
            total: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    const invoices = rawInvoices.map((inv) => {
      const grandTotalNum = Number(inv.grandTotal) || 0;
      const subtotalNum = Number(inv.subtotal) || grandTotalNum;
      const discountNum = Number(inv.discount) || 0;
      const isPaid = inv.paymentStatus === 'PAID' || (inv.status as string) === 'PAID';
      const paidAmount = isPaid ? grandTotalNum : 0;
      const balance = Math.max(0, grandTotalNum - paidAmount);

      return {
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        createdAt: inv.createdAt,
        paymentStatus: inv.paymentStatus || (inv.status as string) || 'PENDING',
        paymentMethod: inv.paymentMode || 'UPI',
        subtotal: subtotalNum,
        discount: discountNum,
        grandTotal: grandTotalNum,
        total: grandTotalNum,
        paidAmount,
        balance,
        patient: inv.patient ? {
          name: inv.patient.name,
          phone: inv.patient.phone || '',
          age: inv.patient.age || 0,
          ageUnit: inv.patient.ageUnit || 'Years',
          gender: inv.patient.gender || ''
        } : null,
        items: (inv.items || []).map((it) => ({
          id: it.id,
          name: it.description,
          price: Number(it.unitPrice) || Number(it.total) || 0,
          quantity: it.quantity || 1,
          total: Number(it.total) || 0
        }))
      };
    });

    // 3. Calculate Stats (Aggregations)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [totalRevenue, pending, overdue, monthly] = await Promise.all([
      // Total Revenue (Paid)
      prisma.invoice.aggregate({
        where: {
          labId: user.labId,
          OR: [{ paymentStatus: 'PAID' }, { status: 'PAID' }]
        },
        _sum: { grandTotal: true }
      }),
      // Pending
      prisma.invoice.aggregate({
        where: {
          labId: user.labId,
          status: 'PENDING',
          paymentStatus: { not: 'PAID' }
        },
        _sum: { grandTotal: true },
        _count: true
      }),
      // Overdue (Status OVERDUE or Pending & older than 30 days)
      prisma.invoice.aggregate({
        where: {
          labId: user.labId,
          paymentStatus: { not: 'PAID' },
          OR: [
            { status: 'OVERDUE' },
            { status: 'PENDING', createdAt: { lt: thirtyDaysAgo } }
          ]
        },
        _sum: { grandTotal: true },
        _count: true
      }),
      // This Month Revenue
      prisma.invoice.aggregate({
        where: {
          labId: user.labId,
          createdAt: { gte: startOfMonth(new Date()), lte: endOfMonth(new Date()) },
          OR: [{ paymentStatus: 'PAID' }, { status: 'PAID' }]
        },
        _sum: { grandTotal: true }
      })
    ]);

    return NextResponse.json({
      invoices,
      stats: {
        totalRevenue: Number(totalRevenue._sum.grandTotal) || 0,
        pendingAmount: Number(pending._sum.grandTotal) || 0,
        pendingCount: pending._count || 0,
        overdueAmount: Number(overdue._sum.grandTotal) || 0,
        overdueCount: overdue._count || 0,
        monthlyRevenue: Number(monthly._sum.grandTotal) || 0
      }
    });

  } catch (error) {
    console.error("Fetch Invoices Error:", error);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}