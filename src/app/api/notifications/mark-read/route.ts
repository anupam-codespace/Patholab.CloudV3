import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Mark all as read
  await prisma.notification.updateMany({
    where: { userId: user.userId, isRead: false },
    data: { isRead: true }
  });

  return NextResponse.json({ success: true });
}