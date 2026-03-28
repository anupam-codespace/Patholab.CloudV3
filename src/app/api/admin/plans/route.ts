import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const plans = await prisma.plan.findMany({
      orderBy: { price: 'asc' },
    });
    return NextResponse.json({ plans });
  } catch (error) {
    console.error('Fetch Plans Error:', error);
    return NextResponse.json({ error: 'Failed to fetch plans' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // Clean data to match your Prisma Schema
    const data = {
        name: body.name,
        displayName: body.displayName,
        description: body.description,
        price: Number(body.price),
        billingCycle: body.billingCycle,
        // Ensure features is a JSON object/array, not a raw string
        features: typeof body.features === 'string' ? JSON.parse(body.features) : body.features,
        maxTests: Number(body.maxTests),
        maxStaff: Number(body.maxStaff),
        maxStorageGB: Number(body.storageGB), // Mapping frontend 'storageGB' to DB 'maxStorageGB'
        hasAnalytics: body.hasAnalytics,
        hasApiAccess: body.hasApiAccess,
        hasWhiteLabel: body.hasWhiteLabel,
        isActive: body.isActive,
        isPopular: body.isPopular,
    };

    const plan = await prisma.plan.create({
      data: data,
    });

    return NextResponse.json(plan);
  } catch (error) {
    console.error('Create Plan Error:', error);
    return NextResponse.json({ error: 'Failed to create plan' }, { status: 400 });
  }
}