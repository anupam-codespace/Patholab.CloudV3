import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { startOfYear, endOfYear } from 'date-fns';
import { z } from 'zod';

// Schema for updating users
const updateUserSchema = z.object({
  userId: z.string(),
  name: z.string().optional(),
  email: z.string().email().optional(),
  role: z.enum(['SUPER_ADMIN', 'LAB_OWNER', 'TECHNICIAN', 'RECEPTIONIST']).optional(),
  isActive: z.boolean().optional(),
});

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';

    // Advanced Filters
    const role = searchParams.get('role');
    const status = searchParams.get('status');
    const state = searchParams.get('state'); // Filter by Lab Location
    const year = searchParams.get('year');   // Filter by Join Date

    const skip = (page - 1) * limit;

    // Build Dynamic Where Clause
    const whereClause: any = {
      AND: [
        {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        },
      ],
    };

    if (role && role !== 'all') {
      whereClause.AND.push({ role });
    }

    if (status && status !== 'all') {
      whereClause.AND.push({ isActive: status === 'active' });
    }

    // Geographic Filter (Users belonging to labs in specific state)
    if (state && state !== 'all') {
      whereClause.AND.push({
        lab: {
          state: { contains: state, mode: 'insensitive' },
        },
      });
    }

    // Temporal Filter
    if (year && year !== 'all') {
      const date = new Date(parseInt(year), 0, 1);
      whereClause.AND.push({
        createdAt: {
          gte: startOfYear(date),
          lte: endOfYear(date),
        },
      });
    }

    // 1. Fetch Data
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          lab: {
            select: { name: true, city: true, state: true },
          },
        },
      }),
      prisma.user.count({ where: whereClause }),
    ]);

    // 2. Fetch Aggregates (Only on first page load for performance)
    let stats: {
      totalUsers: number;
      newUsers: number;
      availableStates: string[];
    } | null = null;

    if (page === 1 && !search && !role) {
      const [totalUsers, newUsers] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({
          where: { createdAt: { gte: startOfYear(new Date()) } },
        }),
      ]);

      // Get unique states list for filter dropdown (non-null)
      const statesRaw = await prisma.lab.findMany({
  select: { state: true },
  distinct: ['state'],
  where: {
    state: {
      not: undefined // ✅ type-safe cast
    },
  },
});

      stats = {
        totalUsers,
        newUsers,
        availableStates: statesRaw
          .map((s) => s.state)
          .filter((s): s is string => Boolean(s)),
      };
    }

    return NextResponse.json({
      data: users,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      stats,
    });
  } catch (error) {
    console.error('Users API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// UPDATE USER
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { userId, ...data } = updateUserSchema.parse(body);

    const user = await prisma.user.update({
      where: { id: userId },
      data,
    });

    return NextResponse.json({ message: 'User updated', user });
  } catch (error) {
    console.error('Update Error:', error);
    return NextResponse.json({ error: 'Update failed' }, { status: 400 });
  }
}

// DELETE USER
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    // Prevent deleting Super Admin
    const user = await prisma.user.findUnique({ where: { id } });
    if (user?.role === 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Cannot delete Super Admin' }, { status: 403 });
    }

    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ message: 'User deleted' });
  } catch (error) {
    console.error('Delete Error:', error);
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
  }
}
