import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { format, eachDayOfInterval, isSameDay } from 'date-fns';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const fromStr = searchParams.get('from');
  const toStr = searchParams.get('to');

  if (!fromStr || !toStr) {
    return NextResponse.json({ error: 'Missing date range' }, { status: 400 });
  }

  const from = new Date(fromStr);
  const to = new Date(toStr);

  try {
    // ==========================================
    // 1. MASSIVE PARALLEL DATA FETCHING
    // ==========================================
    const [
      dailyPayments,
      subscriptions,
      activeLabsCount,
      trialLabsCount,
      testsCount,
      patientsCount,
      samplesTotal,
      samplesRejected,
      tatTests,
      labsByState,
      popularTestsData,
      patientGenders,
      patientsForAge,
      userRoles,
      topLabsData
    ] = await Promise.all([
      // Financials
      prisma.payment.findMany({
        where: { status: 'SUCCESS', createdAt: { gte: from, lte: to } },
        select: { amount: true, createdAt: true }
      }),
      prisma.subscription.findMany({
        where: { status: 'ACTIVE' },
        include: { plan: true }
      }),
      
      // SaaS KPIs
      prisma.lab.count({ where: { isActive: true, deletedAt: null } }),
      prisma.subscription.count({ where: { status: 'TRIAL' } }),
      
      // Medical Volumes
      prisma.test.count({ where: { createdAt: { gte: from, lte: to }, deletedAt: null } }),
      prisma.patient.count({ where: { createdAt: { gte: from, lte: to }, deletedAt: null } }),
      prisma.sample.count({ where: { createdAt: { gte: from, lte: to }, deletedAt: null } }),
      prisma.sample.count({ where: { status: 'REJECTED', createdAt: { gte: from, lte: to }, deletedAt: null } }),
      
      // Operational Efficiency (Turnaround Time)
      prisma.test.findMany({
        where: { 
          status: 'APPROVED', 
          approvedAt: { not: null }, 
          sampleCollectedAt: { not: null },
          createdAt: { gte: from, lte: to },
          deletedAt: null
        },
        select: { sampleCollectedAt: true, approvedAt: true }
      }),

      // Demographics & Charts
      prisma.lab.groupBy({
        by: ['state'],
        _count: { state: true },
        where: { deletedAt: null },
        orderBy: { _count: { state: 'desc' } },
        take: 5
      }),
      prisma.test.groupBy({
        by: ['testName'],
        _count: { testName: true },
        where: { createdAt: { gte: from, lte: to }, deletedAt: null },
        orderBy: { _count: { testName: 'desc' } },
        take: 10
      }),
      prisma.patient.groupBy({
        by: ['gender'],
        _count: { gender: true },
        where: { gender: { not: null }, createdAt: { gte: from, lte: to }, deletedAt: null }
      }),
      prisma.patient.findMany({
        where: { age: { not: null }, createdAt: { gte: from, lte: to }, deletedAt: null },
        select: { age: true }
      }),
      prisma.user.groupBy({
        by: ['role'],
        _count: { role: true },
        where: { deletedAt: null }
      }),

      // Top Performers Matrix
      prisma.lab.findMany({
        where: { deletedAt: null },
        select: {
          id: true,
          name: true,
          state: true,
          _count: { select: { tests: { where: { createdAt: { gte: from, lte: to } } } } },
          invoices: {
            where: { status: 'PAID', createdAt: { gte: from, lte: to } },
            select: { grandTotal: true }
          }
        }
      })
    ]);

    // ==========================================
    // 2. COMPLEX DATA TRANSFORMATIONS
    // ==========================================

    // A. Revenue Calculations
    const totalRevenue = dailyPayments.reduce((sum, p) => sum + Number(p.amount), 0);
    const totalMRR = subscriptions.reduce((sum, sub) => sum + Number(sub.plan.price), 0);

    // B. Revenue Over Time (Fills missing days with 0 for smooth charts)
    const daysInterval = eachDayOfInterval({ start: from, end: to });
    const revenueOverTime = daysInterval.map(day => {
      const paymentsOnDay = dailyPayments.filter(p => isSameDay(new Date(p.createdAt), day));
      const dailyTotal = paymentsOnDay.reduce((sum, p) => sum + Number(p.amount), 0);
      return {
        date: format(day, 'MMM dd'),
        revenue: dailyTotal
      };
    });

    // C. Revenue By SaaS Plan
    const revenueByPlanMap = new Map<string, number>();
    subscriptions.forEach(sub => {
       const planName = sub.plan.name;
       const price = Number(sub.plan.price);
       revenueByPlanMap.set(planName, (revenueByPlanMap.get(planName) || 0) + price);
    });
    const revenueByPlan = Array.from(revenueByPlanMap, ([name, value]) => ({ name, value }));

    // D. Operational Metrics (TAT & Rejection Rates)
    let totalTatMs = 0;
    tatTests.forEach(t => {
      // Calculate difference between Sample Collection and Report Approval
      totalTatMs += t.approvedAt!.getTime() - t.sampleCollectedAt!.getTime();
    });
    const avgTatHrs = tatTests.length > 0 ? (totalTatMs / tatTests.length) / (1000 * 60 * 60) : 0;
    const avgTatString = `${avgTatHrs.toFixed(1)}h`;

    const rejectionRatePercent = samplesTotal > 0 ? (samplesRejected / samplesTotal) * 100 : 0;
    const rejectionRateString = `${rejectionRatePercent.toFixed(1)}%`;

    // E. Demographics Grouping (Age Buckets)
    const ageGroups = { '0-18': 0, '19-35': 0, '36-50': 0, '51-65': 0, '65+': 0 };
    patientsForAge.forEach(p => {
      const age = p.age!;
      if (age <= 18) ageGroups['0-18']++;
      else if (age <= 35) ageGroups['19-35']++;
      else if (age <= 50) ageGroups['36-50']++;
      else if (age <= 65) ageGroups['51-65']++;
      else ageGroups['65+']++;
    });

    // F. Top Performers (Calculated dynamically based on actual collected invoices)
    const formattedTopPerformers = topLabsData
      .map(lab => {
        const labRevenue = lab.invoices.reduce((sum, inv) => sum + Number(inv.grandTotal), 0);
        return {
          name: lab.name,
          location: lab.state || 'N/A',
          tests: lab._count.tests,
          revenue: labRevenue
        };
      })
      .sort((a, b) => b.revenue - a.revenue) // Sort by highest revenue
      .slice(0, 10); // Return Top 10

    // ==========================================
    // 3. FINAL JSON PAYLOAD
    // ==========================================
    return NextResponse.json({
      kpi: {
        revenue: totalRevenue,
        mrr: totalMRR,
        activeLabs: activeLabsCount,
        trialLabs: trialLabsCount,
        tests: testsCount,
        patients: patientsCount,
        avgTat: avgTatString,
        rejectionRate: rejectionRateString
      },
      charts: {
        revenueOverTime,
        revenueByPlan,
        popularTests: popularTestsData.map(t => ({ name: t.testName, value: t._count.testName })),
        geoData: labsByState.map(s => ({ name: s.state || 'Unknown', value: s._count.state })),
        demographics: {
          gender: patientGenders.map(g => ({ name: g.gender, value: g._count.gender })),
          age: Object.entries(ageGroups).map(([name, value]) => ({ name, value }))
        },
        userRoles: userRoles.map(r => ({
          name: r.role.replace('_', ' '),
          value: r._count.role
        }))
      },
      topPerformers: formattedTopPerformers
    });

  } catch (error) {
    console.error('Advanced Analytics Fetch Error:', error);
    return NextResponse.json({ error: 'Failed to process analytics data' }, { status: 500 });
  }
}