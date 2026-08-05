import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { headers } from 'next/headers';

// In a real app, use actual Auth middleware to get user ID
async function getUser() {
  // Mock logic: If 'admin' header is present, act as Super Admin
  const headersList = headers();
  const isAdmin = headersList.get('x-is-admin') === 'true';
  
  if (isAdmin) return { id: 'super-admin-id', role: 'SUPER_ADMIN' };
  
  // Otherwise find the first lab owner
  const user = await prisma.user.findFirst({ where: { role: 'LAB_OWNER' } });
  return user;
}

export async function GET(req: Request) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');

    const whereClause: any = {};
    
    // If not admin, only see own tickets
    if (user.role !== 'SUPER_ADMIN') {
      whereClause.userId = user.id;
    }

    if (status && status !== 'all') whereClause.status = status;
    if (priority && priority !== 'all') whereClause.priority = priority;

    const tickets = await prisma.supportTicket.findMany({
      where: whereClause,
      include: {
        user: { select: { name: true, email: true, lab: { select: { name: true } } } },
        _count: { select: { messages: true } }
      },
      orderBy: { updatedAt: 'desc' }
    });

    return NextResponse.json(tickets);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch tickets' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    
    // Auto-generate ticket number (e.g., TKT-1001)
    const count = await prisma.supportTicket.count();
    const ticketNumber = `TKT-${1000 + count + 1}`;

    const ticket = await prisma.supportTicket.create({
      data: {
        ticketNumber,
        userId: user.id,
        subject: body.subject,
        description: body.description,
        priority: body.priority || 'MEDIUM',
        category: body.category || 'GENERAL',
        messages: {
          create: {
            message: body.description,
            isStaff: false,
            senderName: 'User' // In prod, use user.name
          }
        }
      }
    });

    return NextResponse.json(ticket);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create ticket' }, { status: 500 });
  }
}