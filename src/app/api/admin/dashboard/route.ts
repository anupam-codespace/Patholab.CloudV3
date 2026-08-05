import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { startOfMonth, subMonths, endOfMonth, startOfDay, subDays } from 'date-fns';

export const dynamic = 'force-dynamic'; // Ensure this route is never cached statically

export async function GET() {
  try {
    // 1. Define Date Ranges for Trend Calculation
    const now = new Date();
    const startOfCurrentMonth = startOfMonth(now);
    const startOfLastMonth = startOfMonth(subMonths(now, 1));
    const endOfLastMonth = endOfMonth(subMonths(now, 1));

    // 2. Fetch All Data in Parallel (High Performance)
    const [
      totalLabs,
      lastMonthLabs,
      activeLabs,
      
      totalUsers,
      lastMonthUsers,
      
      totalTests,
      lastMonthTests,
      
      currentRevenueResult,
      lastMonthRevenueResult,
      totalRevenueResult,
      
      recentLabs,
      revenueGraph
    ] = await Promise.all([
      // A. Lab Stats
      prisma.lab.count(),
      prisma.lab.count({ where: { createdAt: { lt: startOfCurrentMonth } } }),
      prisma.lab.count({ where: { isActive: true } }),

      // B. User Stats
      prisma.user.count(),
      prisma.user.count({ where: { createdAt: { lt: startOfCurrentMonth } } }),

      // C. Test Stats
      prisma.test.count(),
      prisma.test.count({ where: { createdAt: { lt: startOfCurrentMonth } } }),

      // D. Revenue Stats (Current Month)
      prisma.payment.aggregate({
        where: { 
          status: 'SUCCESS',
          createdAt: { gte: startOfCurrentMonth }
        },
        _sum: { amount: true }
      }),
      // Revenue Stats (Last Month)
      prisma.payment.aggregate({
        where: { 
          status: 'SUCCESS',
          createdAt: { gte: startOfLastMonth, lte: endOfLastMonth }
        },
        _sum: { amount: true }
      }),
      // Total Revenue (All Time)
      prisma.payment.aggregate({
        where: { status: 'SUCCESS' },
        _sum: { amount: true }
      }),

      // E. Recent Registrations Table
      prisma.lab.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          owner: {
            select: { name: true, email: true }
          },
          // Count tests for each lab to show activity level
          _count: {
            select: { tests: true }
          }
        }
      }),

      // F. Revenue Graph Data (Last 6 Months)
      // Note: GroupBy is ideal, but raw query is often cleaner for date truncation in Postgres. 
      // For simplicity/compatibility, we will fetch aggregates for the last 6 months.
      getRevenueHistory()
    ]);

    // 3. Calculate Trends (Percentage Growth)
    const calculateTrend = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100);
    };

    // Derived values
    const currentRevenue = currentRevenueResult._sum.amount || 0;
    const lastRevenue = lastMonthRevenueResult._sum.amount || 0;
    const allTimeRevenue = totalRevenueResult._sum.amount || 0;

    // Actual growth numbers
    const labsGrowth = totalLabs - lastMonthLabs; // Net new labs this month
    const usersGrowth = totalUsers - lastMonthUsers;
    const testsGrowth = totalTests - lastMonthTests;

    // Percentage trends
    const revenueTrend = calculateTrend(currentRevenue, lastRevenue);
    const labsTrend = calculateTrend(labsGrowth, lastMonthLabs); // This compares new labs count vs total base
    const testsTrend = calculateTrend(testsGrowth, lastMonthTests);

    // 4. Structure the Response
    return NextResponse.json({
      stats: {
        totalLabs,
        activeLabs,
        labsTrend: labsGrowth >= 0 ? `+${labsGrowth}` : `${labsGrowth}`,
        
        totalUsers,
        usersTrend: usersGrowth >= 0 ? `+${usersGrowth}%` : `${usersGrowth}%`,
        
        totalTests,
        testsTrend: testsTrend >= 0 ? `+${testsTrend}%` : `${testsTrend}%`,
        
        totalRevenue: allTimeRevenue,
        monthlyRevenue: currentRevenue,
        revenueTrend: revenueTrend >= 0 ? `+${revenueTrend}%` : `${revenueTrend}%`,
        revenueTrendUp: revenueTrend >= 0,
      },
      recentLabs: recentLabs.map(lab => ({
        id: lab.id,
        name: lab.name,
        owner: lab.owner,
        status: lab.isActive ? 'Active' : 'Inactive',
        testsCount: lab._count.tests,
        joinedAt: lab.createdAt,
      })),
      revenueData: revenueGraph,
    });

  } catch (error) {
    console.error('Dashboard Data Fetch Error:', error);
    return NextResponse.json(
      { error: 'Failed to load dashboard data' }, 
      { status: 500 }
    );
  }
}

// Helper function to get graph data
async function getRevenueHistory() {
  const months = 6;
  const history = [];
  
  for (let i = months - 1; i >= 0; i--) {
    const start = startOfMonth(subMonths(new Date(), i));
    const end = endOfMonth(subMonths(new Date(), i));
    const monthName = start.toLocaleString('default', { month: 'short' });

    const result = await prisma.payment.aggregate({
      where: {
        status: 'SUCCESS',
        createdAt: { gte: start, lte: end }
      },
      _sum: { amount: true }
    });

    history.push({
      month: monthName,
      revenue: result._sum.amount || 0
    });
  }
  
  return history;
}