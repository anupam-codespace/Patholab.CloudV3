import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getDataFromToken } from '@/lib/auth';
import { startOfDay, endOfDay, subDays, eachDayOfInterval, format, startOfMonth, startOfYear } from 'date-fns';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // 1. Authenticate Request
    const user = await getDataFromToken(req);
    if (!user || !user.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // 2. Enterprise Query: Fetch User + Owner Lab OR Staff Profiles
    const dbUser = await prisma.user.findUnique({
      where: { id: user.userId },
      include: { 
        lab: { include: { wallet: true } }, // A. If LAB_OWNER
        staffLabs: { 
          include: { 
            lab: { include: { wallet: true } } // B. If STAFF
          } 
        } 
      }
    });

    // 3. Resolve Lab Context
    const activeLab = dbUser?.lab || dbUser?.staffLabs[0]?.lab;
    if (!activeLab) return NextResponse.json({ status: 'PENDING_SETUP' });

    const labId = activeLab.id;

    // 4. Handle Date Ranges for the UI Dropdown
    const { searchParams } = new URL(req.url);
    const range = searchParams.get('range') || '30D'; 

    let from = new Date();
    const to = new Date();

    if (range === 'TODAY') from = startOfDay(new Date());
    else if (range === '7D') from = subDays(new Date(), 7);
    else if (range === '30D') from = subDays(new Date(), 30);
    else if (range === 'MONTH') from = startOfMonth(new Date());
    else if (range === 'YEAR') from = startOfYear(new Date());

    const dateFilter = { createdAt: { gte: startOfDay(from), lte: endOfDay(to) } };

    // 5. Safely Execute Parallel Queries WITH Date Filters
    const [invoices, testCounts, inventoryItems, recentPatients] = await Promise.all([
      prisma.invoice.findMany({ 
        where: { labId, status: { not: 'CANCELLED' }, ...dateFilter },
        select: { grandTotal: true, createdAt: true }
      }),
      prisma.test.findMany({ 
        where: { labId, ...dateFilter },
        select: { id: true, createdAt: true }
      }),
      prisma.inventoryItem.findMany({ 
        where: { labId, isActive: true }, 
        include: { batches: { where: { currentQuantity: { gt: 0 } } } } 
      }),
      prisma.patient.findMany({ 
        where: { labId }, 
        take: 6, 
        orderBy: { createdAt: 'desc' },
        select: { id: true, name: true, phone: true }
      })
    ]);

    // 6. Aggregate Calculations
    const totalRevenue = invoices.reduce((sum, i) => sum + Number(i.grandTotal), 0);
    const totalTests = testCounts.length;

    // 7. Generate Chart Data (Daily breakdown)
    const days = eachDayOfInterval({ start: from, end: to });
    const trendChart = days.map(day => {
        const dateKey = format(day, 'yyyy-MM-dd');
        
        const dayRev = invoices
          .filter(i => format(i.createdAt, 'yyyy-MM-dd') === dateKey)
          .reduce((sum, i) => sum + Number(i.grandTotal), 0);
          
        const dayTests = testCounts
          .filter(t => format(t.createdAt, 'yyyy-MM-dd') === dateKey)
          .length;
          
        return { 
          date: range === 'TODAY' ? format(day, 'ha') : format(day, 'MMM dd'), 
          revenue: dayRev, 
          tests: dayTests 
        };
    });

    // Calculate critical inventory items (Total stock < 5)
    const lowStockCount = inventoryItems.filter(i => 
      i.batches.reduce((sum, b) => sum + b.currentQuantity, 0) < 5
    ).length;

    // 8. Construct Response for the Workspace Dashboard
    return NextResponse.json({
        status: 'ACTIVE',
        labDetails: {
            name: activeLab.name,
        },
        kpi: {
            revenue: totalRevenue,
            walletBalance: activeLab.wallet ? Number(activeLab.wallet.balance) : 0, // Critical for UI Alerts
            totalTests: totalTests,
        },
        charts: { 
            trend: trendChart 
        },
        alerts: { 
            inventory: lowStockCount
        },
        recentPatients
    });

  } catch (error: any) {
    console.error('Dashboard API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}