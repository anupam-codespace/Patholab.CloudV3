import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const notifications = await prisma.notification.findMany({
    where: { userId: user.userId },
    orderBy: { createdAt: 'desc' },
    take: 20 // Limit to last 20 notifications
  });

  const unreadCount = await prisma.notification.count({
    where: { userId: user.userId, isRead: false }
  });

  return NextResponse.json({ notifications, unreadCount });
}