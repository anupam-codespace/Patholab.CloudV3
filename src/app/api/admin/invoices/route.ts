export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { startOfDay, endOfDay, parseISO } from 'date-fns';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    // 1. Authenticate Request
    const user = await getCurrentUser();
    if (!user || user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const search = searchParams.get('search') || '';
    const type = searchParams.get('type') || 'RECHARGE'; // Only fetch Wallet Recharges
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    const skip = (page - 1) * limit;

    // 2. Build Query using the new WalletTransaction model
    const whereClause: any = {
      type: type, // Matches 'RECHARGE'
    };

    // Advanced relational searching (Transaction ID or Lab Name)
    if (search) {
      whereClause.OR = [
        { id: { contains: search, mode: 'insensitive' } },
        {
          wallet: {
            lab: { name: { contains: search, mode: 'insensitive' } }
          }
        },
      ];
    }

    if (from && to) {
      whereClause.createdAt = {
        gte: startOfDay(parseISO(from)),
        lte: endOfDay(parseISO(to)),
      };
    }

    // 3. Fetch Transactions & Stats Concurrently
    const [transactions, total, stats] = await Promise.all([
      prisma.walletTransaction.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          wallet: {
            include: {
              lab: { 
                select: { 
                  name: true, 
                  email: true, 
                  gstNumber: true, 
                  address: true, 
                  city: true, 
                  pincode: true 
                } 
              }
            }
          }
        }
      }),
      prisma.walletTransaction.count({ where: whereClause }),
      
      // Calculate Total Historical Revenue from Recharges
      prisma.walletTransaction.aggregate({
        where: { type: 'RECHARGE' },
        _sum: { amount: true }
      })
    ]);

    // 4. Format & Return
    return NextResponse.json({
      data: transactions,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      },
      stats: {
        totalRevenue: Number(stats._sum.amount || 0)
      }
    });

  } catch (error) {
    console.error('[ADMIN_INVOICES_API_ERROR]:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}