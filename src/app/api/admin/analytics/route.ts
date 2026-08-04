export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { format, eachDayOfInterval, isSameDay } from 'date-fns';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    // 1. Secure Authentication
    const user = await getCurrentUser();
    if (!user || user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const fromStr = searchParams.get('from');
    const toStr = searchParams.get('to');

    if (!fromStr || !toStr) {
      return NextResponse.json({ error: 'Missing date range' }, { status: 400 });
    }

    const from = new Date(fromStr);
    const to = new Date(toStr);

    // A disease is counted only when an approved test has an explicitly positive
    // result. Test names alone represent orders, not confirmed cases.
    const confirmedPositiveResult = {
      some: {
        OR: [
          { flag: { contains: 'positive', mode: 'insensitive' as const } },
          { textValue: { contains: 'positive', mode: 'insensitive' as const } },
          {
            AND: [
              { textValue: { contains: 'detected', mode: 'insensitive' as const } },
              { NOT: { textValue: { contains: 'not detected', mode: 'insensitive' as const } } }
            ]
          }
        ]
      }
    };

    // ==========================================
    // 1. MASSIVE PARALLEL DATA FETCHING
    // ==========================================
    const [
      dailyRecharges,
      dailyDeductions,
      activeLabsCount,
      lowBalanceLabsCount,
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
      // Disease Surveillance Real Data Counts
      dengueCount,
      malariaCount,
      typhoidCount,
      fluCount,
      topLabsData
    ] = await Promise.all([
      // Financials (Wallet Pivot)
      prisma.walletTransaction.findMany({
        where: { type: 'RECHARGE', createdAt: { gte: from, lte: to } },
        select: { amount: true, createdAt: true }
      }),
      prisma.walletTransaction.findMany({
        where: { type: { in: ['DEDUCTION', 'SETUP_FEE'] }, createdAt: { gte: from, lte: to } },
        select: { amount: true }
      }),
      
      // Tenant KPIs
      prisma.lab.count({ where: { isActive: true, deletedAt: null } }),
      prisma.labWallet.count({ where: { balance: { lt: 500 } } }),
      
      // Medical Volumes
      prisma.test.count({ where: { createdAt: { gte: from, lte: to } } }),
      prisma.patient.count({ where: { createdAt: { gte: from, lte: to }, deletedAt: null } }),
      prisma.sample.count({ where: { createdAt: { gte: from, lte: to } } }),
      prisma.sample.count({ where: { status: 'REJECTED', createdAt: { gte: from, lte: to } } }),
      
      // Operational Efficiency (Turnaround Time)
      prisma.test.findMany({
        where: { 
          status: 'APPROVED', 
          approvedAt: { not: null }, 
          sampleCollectedAt: { not: null },
          createdAt: { gte: from, lte: to }
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
        where: { createdAt: { gte: from, lte: to } },
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

     // --- Epidemiological Surveillance Real Data Queries ---
      prisma.test.count({
        where: {
          approvedAt: { gte: from, lte: to },
          status: 'APPROVED',
          results: confirmedPositiveResult,
          testName: { contains: "Dengue", mode: "insensitive" }
        }
      }),
      prisma.test.count({
        where: {
          approvedAt: { gte: from, lte: to },
          status: 'APPROVED',
          results: confirmedPositiveResult,
          testName: { contains: "Malaria", mode: "insensitive" }
        }
      }),
      prisma.test.count({
        where: {
          approvedAt: { gte: from, lte: to },
          status: 'APPROVED',
          results: confirmedPositiveResult,
          testName: { contains: "Typhoid", mode: "insensitive" }
        }
      }),
      prisma.test.count({
        where: {
          approvedAt: { gte: from, lte: to },
          status: 'APPROVED',
          results: confirmedPositiveResult,
          OR: [
            { testName: { contains: "Influenza", mode: "insensitive" } },
            { testName: { contains: "Covid", mode: "insensitive" } }
          ]
        }
      }),

      // Top Performers Matrix (Calculated by Recharges)
      prisma.lab.findMany({
        where: { deletedAt: null },
        select: {
          id: true,
          name: true,
          state: true,
          _count: { select: { tests: { where: { createdAt: { gte: from, lte: to } } } } },
          wallet: {
            select: {
              transactions: {
                where: { type: 'RECHARGE', createdAt: { gte: from, lte: to } },
                select: { amount: true }
              }
            }
          }
        }
      })
    ]);

    // ==========================================
    // 2. COMPLEX DATA TRANSFORMATIONS
    // ==========================================

    // A. Revenue Calculations
    const totalRevenue = dailyRecharges.reduce((sum, p) => sum + Number(p.amount), 0);
    const totalConsumed = dailyDeductions.reduce((sum, p) => sum + Number(p.amount), 0);

    // B. Revenue Over Time (Fills missing days with 0 for smooth charts)
    const daysInterval = eachDayOfInterval({ start: from, end: to });
    const revenueOverTime = daysInterval.map(day => {
      const rechargesOnDay = dailyRecharges.filter(p => isSameDay(new Date(p.createdAt), day));
      const dailyTotal = rechargesOnDay.reduce((sum, p) => sum + Number(p.amount), 0);
      return {
        date: format(day, 'MMM dd'),
        revenue: dailyTotal
      };
    });

    // C. Top Performers
    const formattedTopPerformers = topLabsData
      .map(lab => {
        const labRevenue = lab.wallet?.transactions.reduce((sum, tx) => sum + Number(tx.amount), 0) || 0;
        return {
          name: lab.name,
          location: lab.state || 'N/A',
          tests: lab._count.tests,
          revenue: labRevenue
        };
      })
      .sort((a, b) => b.revenue - a.revenue);

    // D. Revenue By Top 5 Labs
    const top5Labs = formattedTopPerformers.slice(0, 5);
    const revenueByTopLabs = top5Labs.map(l => ({ name: l.name, value: l.revenue }));

    // E. Operational Metrics (TAT & Rejection Rates)
    let totalTatMs = 0;
    tatTests.forEach(t => {
      totalTatMs += t.approvedAt!.getTime() - t.sampleCollectedAt!.getTime();
    });
    const avgTatHrs = tatTests.length > 0 ? (totalTatMs / tatTests.length) / (1000 * 60 * 60) : 0;
    const avgTatString = `${avgTatHrs.toFixed(1)}h`;

    const rejectionRatePercent = samplesTotal > 0 ? (samplesRejected / samplesTotal) * 100 : 0;
    const rejectionRateString = `${rejectionRatePercent.toFixed(1)}%`;

    // F. Demographics Grouping (Age Buckets)
    const ageGroups = { '0-18': 0, '19-35': 0, '36-50': 0, '51-65': 0, '65+': 0 };
    patientsForAge.forEach(p => {
      const age = p.age!;
      if (age <= 18) ageGroups['0-18']++;
      else if (age <= 35) ageGroups['19-35']++;
      else if (age <= 50) ageGroups['36-50']++;
      else if (age <= 65) ageGroups['51-65']++;
      else ageGroups['65+']++;
    });

    // ==========================================
    // 3. FINAL JSON PAYLOAD
    // ==========================================
    return NextResponse.json({
      kpi: {
        revenue: totalRevenue,
        consumed: totalConsumed,
        activeLabs: activeLabsCount,
        lowBalanceLabs: lowBalanceLabsCount,
        tests: testsCount,
        patients: patientsCount,
        avgTat: avgTatString,
        rejectionRate: rejectionRateString
      },
      charts: {
        diseaseTrends: [
          { name: "Dengue NS1 Antigen", positives: dengueCount, spike: "Live", region: "Global Network" },
          { name: "Malaria Pf/Pv", positives: malariaCount, spike: "Live", region: "Global Network" },
          { name: "Typhoid Widal Ag", positives: typhoidCount, spike: "Live", region: "Global Network" },
          { name: "Influenza / Respiratory", positives: fluCount, spike: "Live", region: "Global Network" },
        ],
        revenueOverTime,
        revenueByTopLabs, 
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
      topPerformers: formattedTopPerformers.slice(0, 10)
    });

  } catch (error) {
    console.error('[ADMIN_ANALYTICS_API_ERROR]:', error);
    return NextResponse.json({ error: 'Failed to process analytics data' }, { status: 500 });
  }
}
