import { prisma } from '@/lib/prisma';
import { endOfDay, startOfDay, format } from 'date-fns';

export async function getAnalyticsData(startDate: Date, endDate: Date) {
  const dateFilter = {
    createdAt: { gte: startDate, lte: endDate },
  };

  const [
    totalRevenue,
    revenueRaw,
    totalTests,
    activeLabs,
    topLabs
  ] = await Promise.all([
    prisma.payment.aggregate({ 
      where: { status: 'SUCCESS', ...dateFilter }, 
      _sum: { amount: true } 
    }),
    prisma.payment.findMany({
      where: { status: 'SUCCESS', ...dateFilter },
      select: { amount: true, createdAt: true, id: true, invoiceId: true },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.test.count({ where: dateFilter }),
    prisma.lab.count({ where: { isActive: true, ...dateFilter } }),
    prisma.lab.findMany({
      take: 20, // Top 20 for Excel
      where: { isActive: true },
      include: {
        owner: { select: { name: true, email: true } },
        _count: { select: { tests: true } },
        invoices: { where: { status: 'PAID', ...dateFilter } }
      }
    })
  ]);

  const topLabsFormatted = topLabs.map(lab => ({
    name: lab.name,
    owner: lab.owner.name,
    email: lab.owner.email,
    city: lab.city || 'N/A',
    state: lab.state || 'N/A',
    tests: lab._count.tests,
    revenue: lab.invoices.reduce((sum, inv) => sum + inv.grandTotal, 0)
  })).sort((a, b) => b.revenue - a.revenue);

  return {
    kpi: {
      revenue: totalRevenue._sum.amount || 0,
      tests: totalTests,
      activeLabs: activeLabs
    },
    revenueList: revenueRaw.map(p => ({
      date: format(p.createdAt, 'yyyy-MM-dd HH:mm'),
      amount: p.amount,
      id: p.id
    })),
    topLabs: topLabsFormatted
  };
}