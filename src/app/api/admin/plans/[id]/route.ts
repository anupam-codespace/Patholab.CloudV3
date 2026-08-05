import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// 1. UPDATE PLAN (PUT)
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();

    // Clean data to match Schema (avoid "Unknown argument" errors)
    const updateData = {
      name: body.name,
      displayName: body.displayName,
      description: body.description,
      price: Number(body.price),
      billingCycle: body.billingCycle,
      maxTests: Number(body.maxTests),
      maxStaff: Number(body.maxStaff),
      maxStorageGB: Number(body.storageGB || body.maxStorageGB), // Handle frontend mapping
      isActive: body.isActive,
      isPopular: body.isPopular,
      hasAnalytics: body.hasAnalytics,
      hasApiAccess: body.hasApiAccess,
      hasWhiteLabel: body.hasWhiteLabel,
      // Parse features if string
      features: typeof body.features === 'string' ? JSON.parse(body.features) : body.features,
    };

    const plan = await prisma.plan.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json(plan);
  } catch (error) {
    console.error('Update Plan Error:', error);
    return NextResponse.json({ error: 'Failed to update plan' }, { status: 500 });
  }
}

// 2. DELETE PLAN (DELETE)
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    // Check for active subscriptions before deleting
    const activeSubs = await prisma.subscription.count({
      where: { planId: params.id }
    });

    if (activeSubs > 0) {
      return NextResponse.json(
        { error: `Cannot delete: ${activeSubs} labs are using this plan.` }, 
        { status: 409 }
      );
    }

    await prisma.plan.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: 'Plan deleted successfully' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete plan' }, { status: 500 });
  }
}