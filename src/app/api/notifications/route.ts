import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getDataFromToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // 1. Authenticate using the unified token helper
    const user = await getDataFromToken(req);
    if (!user || !user.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Fetch Recent Activity 
    // Since there is no Notification model, we use ActivityLog as a proxy
    // to populate the bell icon dropdown in the UI.
    const recentActivity = await prisma.activityLog.findMany({
      where: { userId: user.userId },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    // 3. Map to the shape your frontend expects
    const notifications = recentActivity.map(log => ({
      id: log.id,
      title: log.action,
      message: log.description,
      isRead: true, // Activity logs don't have a read state
      createdAt: log.createdAt
    }));

    // 4. Return safe payload
    return NextResponse.json({ 
      notifications, 
      unreadCount: 0 // Hardcoded to 0 so the red badge doesn't get stuck
    });

  } catch (error: any) {
    console.error('Notifications API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}