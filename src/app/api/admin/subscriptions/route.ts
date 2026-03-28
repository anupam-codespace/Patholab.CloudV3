export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { startOfMonth, subMonths } from 'date-fns';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status'); // ACTIVE, PAST_DUE, CANCELLED
    const planId = searchParams.get('planId');

    const skip = (page - 1) * limit;

    // 1. Build Query
    const whereClause: any = {
      OR: [
        { lab: { name: { contains: search, mode: 'insensitive' } } },
        { lab: { email: { contains: search, mode: 'insensitive' } } },
      ]
    };

    if (status && status !== 'all') whereClause.status = status;
    if (planId && planId !== 'all') whereClause.planId = planId;

    // 2. Fetch Data (Parallel)
    const [subscriptions, total, stats] = await Promise.all([
      // A. List Data
      prisma.subscription.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { startDate: 'desc' },
        include: {
          lab: { select: { name: true, email: true, city: true } },
          plan: { select: { displayName: true, price: true, billingCycle: true } },
          payments: {
            take: 1,
            orderBy: { createdAt: 'desc' },
            select: { amount: true, status: true, createdAt: true, razorpayPaymentId: true }
          }
        }
      }),
      // B. Total Count
      prisma.subscription.count({ where: whereClause }),
      // C. Financial KPI Stats (Global)
      getFinancialStats()
    ]);

    return NextResponse.json({
      data: subscriptions,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      },
      stats
    });

  } catch (error) {
    console.error('Subscription API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// Helper: Calculate MRR & Churn
async function getFinancialStats() {
  const activeSubs = await prisma.subscription.findMany({
    where: { status: 'ACTIVE' },
    include: { plan: true }
  });

  const totalMRR = activeSubs.reduce((sum, sub) => {
    // Normalize yearly plans to monthly revenue
    const monthlyPrice = sub.plan.billingCycle === 'YEARLY' 
      ? sub.plan.price / 12 
      : sub.plan.price;
    return sum + monthlyPrice;
  }, 0);

  const cancelledLastMonth = await prisma.subscription.count({
    where: { 
      status: 'CANCELLED',
      updatedAt: { gte: subMonths(new Date(), 1) }
    }
  });

  return {
    mrr: totalMRR,
    activeCount: activeSubs.length,
    churnCount: cancelledLastMonth
  };
}