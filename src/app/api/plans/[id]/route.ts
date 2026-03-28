import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const planSchema = z.object({
  name: z.string().min(2),
  displayName: z.string().min(2),
  description: z.string().optional(),
  price: z.number().min(0),
  billingCycle: z.enum(['MONTHLY', 'QUARTERLY', 'YEARLY', 'LIFETIME']),
  features: z.string(), // We store JSON string in DB, but frontend sends array stringified
  maxTests: z.number(),
  maxStaff: z.number(),
  maxStorageGB: z.number(), // Use the correct field name from your schema
  hasAnalytics: z.boolean(),
  hasApiAccess: z.boolean(),
  hasWhiteLabel: z.boolean(),
  isActive: z.boolean(),
  isPopular: z.boolean(),
});

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
    
    // Validate
    // Note: If you have extra fields coming from frontend, extract only what you need
    const data = {
        name: body.name,
        displayName: body.displayName,
        description: body.description,
        price: Number(body.price),
        billingCycle: body.billingCycle,
        features: body.features, // Should be a JSON string or array depending on your DB setup
        maxTests: Number(body.maxTests),
        maxStaff: Number(body.maxStaff),
        maxStorageGB: Number(body.storageGB), // Map storageGB -> maxStorageGB
        hasAnalytics: body.hasAnalytics,
        hasApiAccess: body.hasApiAccess,
        hasWhiteLabel: body.hasWhiteLabel,
        isActive: body.isActive,
        isPopular: body.isPopular,
    };

    // If your schema uses Json type for features, ensure it's parsed
    if (typeof data.features === 'string') {
        try {
            data.features = JSON.parse(data.features);
        } catch (e) {
            // Keep as string if not valid JSON
        }
    }

    const plan = await prisma.plan.create({
      data: data,
    });

    return NextResponse.json(plan);
  } catch (error) {
    console.error('Create Plan Error:', error);
    return NextResponse.json({ error: 'Failed to create plan' }, { status: 400 });
  }
}