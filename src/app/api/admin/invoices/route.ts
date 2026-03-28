export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { startOfDay, endOfDay, parseISO } from 'date-fns';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status');
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    const skip = (page - 1) * limit;

    // 1. Build Query
    const whereClause: any = {
      OR: [
        { invoiceNumber: { contains: search, mode: 'insensitive' } },
        { lab: { name: { contains: search, mode: 'insensitive' } } },
      ]
    };

    if (status && status !== 'all') whereClause.status = status;
    
    if (from && to) {
      whereClause.createdAt = {
        gte: startOfDay(parseISO(from)),
        lte: endOfDay(parseISO(to)),
      };
    }

    // 2. Fetch Invoices & Stats
    const [invoices, total, stats] = await Promise.all([
      prisma.invoice.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          lab: { select: { name: true, email: true, gstNumber: true, address: true } },
          items: true // Include line items
        }
      }),
      prisma.invoice.count({ where: whereClause }),
      
      // Quick Stats for Header
      prisma.invoice.aggregate({
        where: { status: 'PAID' },
        _sum: { grandTotal: true }
      })
    ]);

    return NextResponse.json({
      data: invoices,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      },
      stats: {
        totalRevenue: stats._sum.grandTotal || 0
      }
    });

  } catch (error) {
    console.error('Invoices API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}