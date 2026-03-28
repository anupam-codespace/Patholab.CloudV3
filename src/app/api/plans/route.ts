import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Zod schema for plan creation
const planSchema = z.object({
  name: z.string().min(2),
  displayName: z.string().min(2),
  description: z.string().optional(),
  price: z.number().min(0),
  billingCycle: z.enum(['MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY', 'LIFETIME']),
  features: z.string(), // frontend sends JSON string
  maxTests: z.number(),
  maxStaff: z.number(),
  maxPatients: z.number(),
  storageGB: z.number(), // maps to maxStorageGB in Prisma
  hasAnalytics: z.boolean(),
  hasApiAccess: z.boolean(),
  hasWhiteLabel: z.boolean(),
  isActive: z.boolean(),
  isPopular: z.boolean(),
});

// GET all plans
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

// POST create plan
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = planSchema.parse(body);

    // Convert features string to JSON
    const featuresJson = JSON.parse(data.features);

    const plan = await prisma.plan.create({
      data: {
        name: data.name,
        displayName: data.displayName,
        description: data.description,
        price: data.price,
        billingCycle: data.billingCycle,
        features: featuresJson,
        maxTests: data.maxTests,
        maxStaff: data.maxStaff,
        maxPatients: data.maxPatients, // <-- now works
        maxStorageGB: data.storageGB,
        hasAnalytics: data.hasAnalytics,
        hasApiAccess: data.hasApiAccess,
        hasWhiteLabel: data.hasWhiteLabel,
        isActive: data.isActive,
        isPopular: data.isPopular,
      },
    });

    return NextResponse.json(plan);
  } catch (error: any) {
    console.error('Create Plan Error:', error);

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: 'Failed to create plan' }, { status: 500 });
  }
}
