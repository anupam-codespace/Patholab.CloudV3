import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET: Fetch System Settings
export async function GET() {
  try {
    let config = await prisma.systemConfig.findFirst();
    if (!config) {
      // Create default config if table is empty
      config = await prisma.systemConfig.create({
        data: {
          systemName: 'Patholab',
          currency: 'INR',
          primaryColor: '#3b82f6',
          taxRate: 18.0
        }
      });
    }
    return NextResponse.json(config);
  } catch (error) {
    console.error('Settings GET Error:', error);
    return NextResponse.json({ error: 'Failed to load settings' }, { status: 500 });
  }
}

// PUT: Update System Settings
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    
    // 1. Data Cleaning
    // Remove fields that should not be updated manually or don't exist in Prisma create/update
    const { id, createdAt, updatedAt, ...updateData } = body;

    // 2. Type Conversions (Forms send strings, Prisma needs numbers)
    if (updateData.taxRate !== undefined) updateData.taxRate = Number(updateData.taxRate);
    if (updateData.smtpPort !== undefined) updateData.smtpPort = Number(updateData.smtpPort);

    // 3. Find existing config to update
    const currentConfig = await prisma.systemConfig.findFirst();

    let result;
    if (currentConfig) {
      result = await prisma.systemConfig.update({
        where: { id: currentConfig.id },
        data: updateData,
      });
    } else {
      // Create if missing
      result = await prisma.systemConfig.create({
        data: updateData
      });
    }

    // 4. Audit Log (Best Effort)
    try {
      // In production, get the actual user ID from the session
      // Here we find the first super admin to attribute the change to
      const admin = await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN' } });
      
      if (admin) {
        await prisma.activityLog.create({
          data: {
            action: 'UPDATE_SETTINGS',
            entity: 'SYSTEM',
            entityId: 'GLOBAL',
            description: 'System settings updated via Admin Console',
            userId: admin.id
          }
        });
      }
    } catch (logError) {
      console.warn('Failed to log setting update:', logError);
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Settings PUT Error:', error);
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
  }
}