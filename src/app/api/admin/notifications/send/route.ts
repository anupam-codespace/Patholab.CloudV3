import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const admin = await getCurrentUser();
    // Security: Only Super Admin can send broadcasts
    if (!admin || admin.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await req.json();
    const { 
      targetAudience, // 'ALL', 'LAB_OWNERS', 'TECHNICIANS'
      title, 
      message, 
      type, 
      link, 
      imageUrl 
    } = body;

    // 1. Find Target Users
    let whereClause = {};
    if (targetAudience === 'LAB_OWNERS') whereClause = { role: 'LAB_OWNER' };
    else if (targetAudience === 'TECHNICIANS') whereClause = { role: 'TECHNICIAN' };
    // 'ALL' leaves whereClause empty, selecting everyone

    const users = await prisma.user.findMany({
      where: { 
        ...whereClause,
        isActive: true // Only send to active users
      },
      select: { id: true }
    });

    if (users.length === 0) {
      return NextResponse.json({ error: 'No users found for this target' }, { status: 404 });
    }

    // 2. Bulk Create Notifications
    const notificationsData = users.map(user => ({
      userId: user.id,
      title,
      message,
      type,
      link,
      imageUrl,
      isRead: false
    }));

    await prisma.notification.createMany({
      data: notificationsData
    });

    // 3. Log Admin Action (FIXED HERE)
    await prisma.activityLog.create({
      data: {
        userId: admin.userId,
        action: 'BROADCAST',
        entity: 'NOTIFICATION',
        entityId: 'BROADCAST', // 👈 ADDED THIS LINE TO FIX THE ERROR
        description: `Sent broadcast "${title}" to ${users.length} users.`,
      }
    });

    return NextResponse.json({ 
      success: true, 
      count: users.length 
    });

  } catch (error) {
    console.error('Broadcast Error:', error);
    return NextResponse.json({ error: 'Failed to send notifications' }, { status: 500 });
  }
}