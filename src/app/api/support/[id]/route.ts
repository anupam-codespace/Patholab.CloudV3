import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const ticket = await prisma.supportTicket.findUnique({
    where: { id: params.id },
    include: {
      user: { include: { lab: true } }, // Get context about the complainer
      messages: { orderBy: { createdAt: 'asc' } }
    }
  });
  return NextResponse.json(ticket);
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json();
  const ticket = await prisma.supportTicket.update({
    where: { id: params.id },
    data: body // Update status, priority, etc.
  });
  return NextResponse.json(ticket);
}

// POST for adding replies
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json();
  
  // Note: Add logic here to detect if 'isAdmin' to set isStaff: true
  const message = await prisma.ticketMessage.create({
    data: {
      ticketId: params.id,
      message: body.message,
      isStaff: body.isStaff, // Frontend sends this based on context
      senderName: body.senderName
    }
  });
  
  return NextResponse.json(message);
}