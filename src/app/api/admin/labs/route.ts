import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Strict validation schema for updating lab status
const updateStatusSchema = z.object({
  labId: z.string().uuid('Invalid lab ID format'),
  isActive: z.boolean(),
});

// ========================================================
// GET: FETCH ALL LABS WITH WALLET AND COUNTS (FOR ADMIN)
// ========================================================
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50'); 
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status'); // 'active' | 'inactive' | 'all'
    
    const skip = (page - 1) * limit;

    // Build flexible multi-field query matching your schema relations
    const whereClause: any = {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { licenseNumber: { contains: search, mode: 'insensitive' } },
        { owner: { email: { contains: search, mode: 'insensitive' } } },
      ]
    };

    if (status && status !== 'all') {
      whereClause.isActive = status === 'active';
    }

    // 1. Fetch data concurrently
    const [rawLabs, total] = await Promise.all([
      prisma.lab.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          owner: { 
            select: { name: true, email: true, phone: true } 
          },
          wallet: true, // Pulls the unique relation field 'wallet' mapping to LabWallet
          _count: {
            select: {
              tests: true,
              patients: true,
              staff: true
            }
          }
        }
      }),
      prisma.lab.count({ where: whereClause })
    ]);

    // Format fields to flatten the balance metrics for your frontend dropdown lists and tables
    const labs = rawLabs.map((lab) => ({
      ...lab,
      walletBalance: lab.wallet ? Number(lab.wallet.balance) : 0,
      walletStatus: lab.wallet?.isActive ? 'ACTIVE' : 'INACTIVE',
      validityEndDate: lab.wallet?.validityEndDate || null,
    }));

    // 2. Fetch Dashboard Stat Headers (Aggregated only on initial page load)
    let stats = null;
    if (page === 1 && !search) {
      const [totalLabs, activeLabs, walletLiabilityAggregate] = await Promise.all([
        prisma.lab.count(),
        prisma.lab.count({ where: { isActive: true } }),
        prisma.labWallet.aggregate({ 
          _sum: { balance: true } 
        }) 
      ]);
      
      stats = { 
        totalLabs, 
        activeLabs, 
        totalSystemWalletBalance: walletLiabilityAggregate._sum.balance ? Number(walletLiabilityAggregate._sum.balance) : 0 
      };
    }

    return NextResponse.json({
      labs, 
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      },
      stats
    });

  } catch (error) {
    console.error('Labs Admin GET API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// ========================================================
// PATCH: ACTIVATE / DEACTIVATE LABORATORY PORTAL
// ========================================================
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { labId, isActive } = updateStatusSchema.parse(body);

    // Update state atomically on the target platform workspace record
    const lab = await prisma.lab.update({
      where: { id: labId },
      data: { isActive },
      include: { wallet: true }
    });

    return NextResponse.json({ 
      message: `Lab workspace ${isActive ? 'activated' : 'deactivated'} successfully`, 
      lab 
    });
  } catch (error) {
    console.error('Lab Status PATCH API Error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update lab activation profile state' }, { status: 500 });
  }
}