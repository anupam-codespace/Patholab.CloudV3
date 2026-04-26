export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { startOfMonth, subMonths } from 'date-fns';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    // 1. SECURITY CHECK: Protect financial data
    const user = await getCurrentUser();
    if (!user || user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50'); // Bumped to 50 for admin ease
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status'); // ACTIVE, PAST_DUE, CANCELLED
    const planId = searchParams.get('planId');

    const skip = (page - 1) * limit;

    // 2. Build Query
    const whereClause: any = {};

    if (search) {
      whereClause.OR = [
        { lab: { name: { contains: search, mode: 'insensitive' } } },
        { lab: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }

    if (status && status !== 'all') whereClause.status = status;
    if (planId && planId !== 'all') whereClause.planId = planId;

    // 3. Fetch Data (Parallel)
    const [subscriptions, total, stats] = await Promise.all([
      // A. List Data
      prisma.subscription.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { startDate: 'desc' },
        include: {
          lab: { select: { id: true, name: true, email: true, city: true, labCode: true } },
          plan: { select: { name: true, displayName: true, price: true, billingCycle: true } },
          payments: {
            take: 1,
            orderBy: { createdAt: 'desc' },
            select: { amount: true, status: true, createdAt: true, invoiceNumber: true }
          }
        }
      }),
      // B. Total Count
      prisma.subscription.count({ where: whereClause }),
      // C. Financial KPI Stats
      getFinancialStats()
    ]);

    return NextResponse.json({
      subscriptions, // Kept as 'subscriptions' so your Admin UI maps it correctly
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

// 4. PRESERVED PUT METHOD: Required for the Add-on Manager UI
export async function PUT(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "SUPER_ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const { subscriptionId, unlockedFeatures, boosterBranches, boosterStaff, boosterStorage } = body;

    const updatedSub = await prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        unlockedFeatures, // Array of string SKUs e.g. ["ADDON_INVENTORY"]
        boosterBranches: Number(boosterBranches),
        boosterStaff: Number(boosterStaff),
        boosterStorage: Number(boosterStorage)
      }
    });

    return NextResponse.json({ success: true, subscription: updatedSub }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update subscription" }, { status: 500 });
  }
}

// Helper: Calculate MRR & Churn
async function getFinancialStats() {
  const activeSubs = await prisma.subscription.findMany({
    where: { status: 'ACTIVE' },
    include: { plan: true }
  });

  const totalMRR = activeSubs.reduce((sum, sub) => {
    // FIX: Convert Prisma Decimal to standard JavaScript Number for math
    const planPrice = Number(sub.plan.price) || 0; 
    
    // Normalize yearly plans to monthly revenue
    const monthlyPrice = sub.plan.billingCycle === 'YEARLY' 
      ? planPrice / 12 
      : planPrice;
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