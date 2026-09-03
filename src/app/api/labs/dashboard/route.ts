import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDataFromToken, getCurrentUser } from "@/lib/auth";
import {
  startOfDay,
  endOfDay,
  subDays,
  eachDayOfInterval,
  format,
  startOfMonth,
  startOfYear,
} from "date-fns";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    // 1. Authenticate Request
    const user = (await getDataFromToken(req)) || (await getCurrentUser());
    if (!user || (!user.userId && !user.id))
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = user.userId || user.id;

    // 2. Enterprise Query: Fetch User + Owner Lab OR Staff Profiles
    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        lab: { include: { wallet: true } }, // A. If LAB_OWNER
        staffLabs: {
          include: {
            lab: { include: { wallet: true } }, // B. If STAFF
          },
        },
      },
    });

    // 3. Resolve Lab Context
    let activeLab = dbUser?.lab || dbUser?.staffLabs[0]?.lab;
    if (!activeLab && dbUser?.role === "SUPER_ADMIN") {
      activeLab = await prisma.lab.findFirst({
        where: { isActive: true },
        include: { wallet: true },
      });
    }
    if (!activeLab) return NextResponse.json({ status: "PENDING_SETUP" });

    const labId = activeLab.id;

    // 4. Handle Date Ranges for the UI Dropdown
    const { searchParams } = new URL(req.url);
    const range = searchParams.get("range") || "30D";

    let from = new Date();
    const to = new Date();

    if (range === "TODAY") from = startOfDay(new Date());
    else if (range === "7D") from = subDays(new Date(), 7);
    else if (range === "30D") from = subDays(new Date(), 30);
    else if (range === "MONTH") from = startOfMonth(new Date());
    else if (range === "YEAR") from = startOfYear(new Date());

    const dateFilter = {
      createdAt: { gte: startOfDay(from), lte: endOfDay(to) },
    };

    // 5. Safely Execute Parallel Queries WITH Date Filters
    const [
      invoices,
      testCounts,
      inventoryItems,
      recentPatients,
      expenseData,
      pendingDuesData,
      totalPatients,
      pendingReports,
      // NEW: top commissions and test distribution for charts
      topCommissions,
      testDistribution,
      samplesToday,
      pendingSamples,
      topReferrersData,
      // Add this new variable
    ] = await Promise.all([
      // Revenue & Trends
      prisma.invoice.findMany({
        where: { labId, status: { not: "CANCELLED" }, ...dateFilter },
        select: { grandTotal: true, createdAt: true },
      }),
      // Test Volume
      prisma.test.findMany({
        where: { labId, ...dateFilter },
        select: { id: true, createdAt: true },
      }),
      // Low Stock Alerts
      prisma.inventoryItem.findMany({
        where: { labId, isActive: true },
        include: { batches: { where: { currentQuantity: { gt: 0 } } } },
      }),
      // Recent Patients List
      prisma.patient.findMany({
        where: { labId },
        take: 6,
        orderBy: { createdAt: "desc" },
        select: { id: true, name: true, phone: true },
      }),
      // NEW 1: Total Expenses (Outflow) in date range
      prisma.expense.aggregate({
        where: { labId, date: { gte: startOfDay(from), lte: endOfDay(to) } },
        _sum: { amount: true },
      }),
      // NEW 2: Pending Dues (Unpaid/Partial Invoices - all time so you don't lose track of old debts)
      prisma.invoice.aggregate({
        where: { labId, paymentStatus: { in: ["PENDING", "PARTIAL"] } },
        _sum: { grandTotal: true },
      }),
      // NEW 3: Total Patients (All-time registered)
      prisma.patient.count({ where: { labId } }),
      // NEW 4: Pending Reports (Tests completed but not yet approved/delivered)
      prisma.test.count({ where: { labId, status: "COMPLETED" } }),

      // NEW 5: Top Referrers (Group by Doctor, order by highest commission)
      prisma.commission.groupBy({
        by: ["doctorId"],
        where: {
          test: {
            labId: labId,
            createdAt: { gte: startOfDay(from), lte: endOfDay(to) },
          },
          doctorId: { not: null },
        },
        _sum: { amount: true },
        orderBy: { _sum: { amount: "desc" } },
        take: 5,
      }),

      // NEW 6: Test Distribution for Donut Chart (Grouping by Status)
      prisma.test.groupBy({
        by: ["status"],
        where: { labId, ...dateFilter },
        _count: true,
      }),
      // NEW: Query for Samples Today
      prisma.test.count({
        where: {
          labId,
          createdAt: {
            gte: startOfDay(new Date()),
            lte: endOfDay(new Date()),
          },
        },
      }),
      // NEW: Query for Pending / In-Progress Samples
      prisma.test.count({
        where: {
          labId,
          status: { in: ["PENDING", "SAMPLE_COLLECTED", "IN_PROGRESS"] },
        },
      }),
      // NEW: Group commissions by doctor and sum the amounts
      prisma.commission.groupBy({
        by: ["doctorId"],
        where: {
          test: { labId: labId },
          doctorId: { not: null },
        },
        _sum: { amount: true },
        orderBy: { _sum: { amount: "desc" } },
        take: 5, // Fetch top 5 referrers
      }),
    ]);

    // 6. Aggregate Calculations
    const totalRevenue = invoices.reduce(
      (sum, i) => sum + Number(i.grandTotal),
      0,
    );
    const totalTests = testCounts.length;

    // Convert Prisma Decimal Aggregates to standard Numbers
    const totalExpenses = Number(expenseData?._sum?.amount || 0);
    const totalPendingDues = Number(pendingDuesData?._sum?.grandTotal || 0);
    const netProfit = totalRevenue - totalExpenses;

    // --- Format the new data for the frontend ---
    // Format Donut Chart Data
    const donutChartData = (testDistribution || []).map((item: any) => ({
      name: item.status,
      value: item._count,
    }));

    // (Optional) Fetch actual doctor names based on the IDs from topCommissions
    const topReferrers = await Promise.all(
      (topCommissions || []).map(async (comm: any) => {
        const doc = await prisma.doctor.findUnique({
          where: { id: comm.doctorId as string },
        });
        return {
          id: doc?.id,
          name: doc?.name || "Unknown Doctor",
          amount: Number(comm._sum?.amount || 0),
        };
      }),
    );

    // 7. Generate Chart Data (Daily breakdown)
    const days = eachDayOfInterval({ start: from, end: to });
    const trendChart = days.map((day) => {
      const dateKey = format(day, "yyyy-MM-dd");

      const dayRev = invoices
        .filter((i) => format(i.createdAt, "yyyy-MM-dd") === dateKey)
        .reduce((sum, i) => sum + Number(i.grandTotal), 0);

      const dayTests = testCounts.filter(
        (t) => format(t.createdAt, "yyyy-MM-dd") === dateKey,
      ).length;

      return {
        date: range === "TODAY" ? format(day, "ha") : format(day, "MMM dd"),
        revenue: dayRev,
        tests: dayTests,
      };
    });

    // Calculate critical inventory items (Total stock < 5)
    const lowStockCount = inventoryItems.filter(
      (i) => i.batches.reduce((sum, b) => sum + b.currentQuantity, 0) < 5,
    ).length;

    // 8. Construct Response for the Workspace Dashboard
    return NextResponse.json({
      status: "ACTIVE",
      labDetails: {
        name: activeLab.name,
      },
      kpi: {
        revenue: totalRevenue,
        walletBalance: activeLab.wallet ? Number(activeLab.wallet.balance) : 0, // Critical for UI Alerts
        totalTests: totalTests,
        expenses: totalExpenses,
        pendingDues: totalPendingDues,
        totalPatients: totalPatients,
        pendingReports: pendingReports,
        netProfit: netProfit,
        samplesToday: samplesToday,
        pendingSamples: pendingSamples,
        topReferrers: topReferrers,
        // Add this to the KPI object
      },
      charts: {
        trend: trendChart,
      },
      alerts: {
        inventory: lowStockCount,
      },
      recentPatients,
    });
  } catch (error: any) {
    console.error("Dashboard API Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
