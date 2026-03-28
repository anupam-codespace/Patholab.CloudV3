import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getDataFromToken } from '@/lib/auth';
import { startOfDay, endOfDay, subDays, eachDayOfInterval, format, startOfMonth, startOfYear } from 'date-fns';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getDataFromToken(req);
    if (!user || !user.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const dbUser = await prisma.user.findUnique({
      where: { id: user.userId },
      include: { lab: { include: { subscription: true } } }
    });

    if (!dbUser?.lab) return NextResponse.json({ status: 'PENDING_SETUP' });

    const labId = dbUser.lab.id;
    const { searchParams } = new URL(req.url);
    const range = searchParams.get('range') || '30D'; // 'TODAY', '7D', '30D', 'MONTH', 'YEAR'

    let from = new Date();
    const to = new Date();

    if (range === 'TODAY') from = startOfDay(new Date());
    else if (range === '7D') from = subDays(new Date(), 7);
    else if (range === '30D') from = subDays(new Date(), 30);
    else if (range === 'MONTH') from = startOfMonth(new Date());
    else if (range === 'YEAR') from = startOfYear(new Date());

    const dateFilter = { createdAt: { gte: startOfDay(from), lte: endOfDay(to) } };
    const dateFilterForExpenses = { date: { gte: startOfDay(from), lte: endOfDay(to) } };

    // --- PARALLEL DATA FETCHING ---
    const [
      invoices,
      testCounts,
      manualExpenses,
      commissions,
      inventoryPurchases,
      inventoryItems, 
      recentPatients
    ] = await Promise.all([
      // 1. REVENUE (Invoices)
      prisma.invoice.findMany({
        where: { labId, status: { not: 'CANCELLED' }, ...dateFilter },
        select: { grandTotal: true, createdAt: true, status: true }
      }),

      // 2. TESTS (Volume & Status)
      prisma.test.findMany({
        where: { labId, ...dateFilter },
        select: { status: true, createdAt: true }
      }),

      // 3. EXPENSES: Manual
      prisma.expense.findMany({
        where: { labId, ...dateFilterForExpenses },
        select: { amount: true, date: true }
      }),

      // 4. EXPENSES: Commissions
      prisma.commission.findMany({
        where: { test: { labId }, status: 'PAID', paidAt: { gte: startOfDay(from), lte: endOfDay(to) } },
        select: { amount: true, paidAt: true }
      }),

      // 5. EXPENSES: Inventory
      prisma.inventoryBatch.findMany({
        where: { labId, ...dateFilter },
        select: { costPrice: true, createdAt: true }
      }),

      // 6. ALL INVENTORY ITEMS
      prisma.inventoryItem.findMany({
        where: { labId, isActive: true },
        include: { batches: { where: { currentQuantity: { gt: 0 } } } }
      }),

      // 7. RECENT PATIENTS
      prisma.patient.findMany({
        where: { labId }, take: 5, orderBy: { createdAt: 'desc' },
        select: { id: true, name: true, phone: true, gender: true, age: true, _count: { select: { tests: true } } }
      })
    ]);

    // --- AGGREGATIONS ---

    // Revenue
    const totalRevenue = invoices.filter(i => i.status === 'PAID').reduce((sum, i) => sum + i.grandTotal, 0);
    const pendingRevenue = invoices.filter(i => i.status === 'OVERDUE' || i.status === 'PENDING').reduce((sum, i) => sum + i.grandTotal, 0);

    // Expenses
    const totalManualExp = manualExpenses.reduce((sum, e) => sum + e.amount, 0);
    const totalCommExp = commissions.reduce((sum, c) => sum + c.amount, 0);
    const totalInvExp = inventoryPurchases.reduce((sum, i) => sum + (i.costPrice || 0), 0);
    const totalExpense = totalManualExp + totalCommExp + totalInvExp;

    // Profit
    const netProfit = totalRevenue - totalExpense;

    // Test KPI
    const totalTests = testCounts.length;
    const completedToday = testCounts.filter(t => 
        (t.status === 'COMPLETED' || t.status === 'APPROVED') && 
        new Date(t.createdAt) >= startOfDay(new Date())
    ).length;

    // --- CHART DATA GENERATION (Daily Arrays) ---
    const days = eachDayOfInterval({ start: from, end: to });
    const trendChart = days.map(day => {
        const dateKey = format(day, 'yyyy-MM-dd');
        
        const dayRev = invoices
            .filter(i => i.status === 'PAID' && format(i.createdAt, 'yyyy-MM-dd') === dateKey)
            .reduce((sum, i) => sum + i.grandTotal, 0);

        const dayExpManual = manualExpenses.filter(e => format(e.date, 'yyyy-MM-dd') === dateKey).reduce((s,e) => s + e.amount, 0);
        const dayExpComm = commissions.filter(c => format(c.paidAt!, 'yyyy-MM-dd') === dateKey).reduce((s,c) => s + c.amount, 0);
        const dayExpInv = inventoryPurchases.filter(i => format(i.createdAt, 'yyyy-MM-dd') === dateKey).reduce((s,i) => s + (i.costPrice||0), 0);
        const dayExp = dayExpManual + dayExpComm + dayExpInv;

        const dayTests = testCounts.filter(t => format(t.createdAt, 'yyyy-MM-dd') === dateKey).length;

        return {
            date: format(day, 'MMM dd'),
            revenue: dayRev,
            expense: dayExp,
            profit: dayRev - dayExp,
            tests: dayTests
        };
    });

    // Status Distribution
    const statusMap = testCounts.reduce((acc, curr) => {
        acc[curr.status] = (acc[curr.status] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    // INVENTORY STATUS MATH
    const inventoryStatus = inventoryItems.map(item => {
        const totalStock = item.batches.reduce((sum, b) => sum + b.currentQuantity, 0);
        return {
            id: item.id, 
            name: item.name, 
            currentStock: totalStock, 
            unit: item.usageUnit, 
            minStockLevel: item.minStockLevel,
            isCritical: totalStock === 0,
            isLowStock: totalStock > 0 && totalStock <= item.minStockLevel,
            isHealthy: totalStock > item.minStockLevel
        };
    }).sort((a, b) => {
        if (a.isCritical && !b.isCritical) return -1;
        if (!a.isCritical && b.isCritical) return 1;
        if (a.isLowStock && !b.isLowStock) return -1;
        if (!a.isLowStock && b.isLowStock) return 1;
        return a.currentStock - b.currentStock;
    }).slice(0, 6);


    return NextResponse.json({
        status: 'ACTIVE',
        // ✅ NEW: Passing lab details for the dashboard
        labDetails: {
            name: dbUser.lab.name,
            email: dbUser.lab.email,
            phone: dbUser.lab.phone,
            address: `${dbUser.lab.address}, ${dbUser.lab.city}, ${dbUser.lab.state} - ${dbUser.lab.pincode}`,
            licenseNumber: dbUser.lab.licenseNumber
        },
        kpi: {
            revenue: totalRevenue,
            expense: totalExpense,
            profit: netProfit,
            pendingRevenue: pendingRevenue,
            totalTests: totalTests,
            completedToday: completedToday
        },
        charts: {
            trend: trendChart,
            statusDistribution: [
                { name: 'Pending', value: (statusMap['PENDING'] || 0) + (statusMap['SAMPLE_COLLECTED'] || 0), fill: '#f59e0b' },
                { name: 'In Progress', value: statusMap['IN_PROGRESS'] || 0, fill: '#3b82f6' },
                { name: 'Completed', value: (statusMap['COMPLETED'] || 0) + (statusMap['APPROVED'] || 0), fill: '#22c55e' },
                { name: 'Cancelled', value: statusMap['CANCELLED'] || 0, fill: '#ef4444' }
            ]
        },
        alerts: { 
            inventory: inventoryStatus, 
            totalTrackedItems: inventoryItems.length 
        },
        recentPatients: recentPatients
    });

  } catch (error: any) {
    console.error('Dashboard Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}