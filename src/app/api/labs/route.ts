// FILE: src/app/api/labs/route.ts
// Lab management endpoints
// ==========================================
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createLabSchema } from '@/lib/validation';

// GET: Fetch all labs (Admin only)
export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    if (currentUser.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const labs = await prisma.lab.findMany({
      include: {
        owner: { select: { id: true, name: true, email: true } },
        subscription: { include: { plan: true } },
        _count: { select: { patients: true, tests: true, staff: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ labs });
  } catch (error) {
    console.error('Get labs error:', error);
    return NextResponse.json({ error: 'Failed to fetch labs' }, { status: 500 });
  }
}

// POST: Create new lab with trial subscription
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createLabSchema.parse(body);

    // Check if user already owns a lab
    const existingLab = await prisma.lab.findUnique({
      where: { ownerId: currentUser.userId },
    });
    if (existingLab) {
      return NextResponse.json(
        { error: 'You already have a registered laboratory' },
        { status: 400 }
      );
    }

    // Check if license number is unique
    const licenseExists = await prisma.lab.findUnique({
      where: { licenseNumber: validatedData.licenseNumber },
    });
    if (licenseExists) {
      return NextResponse.json(
        { error: 'License number already registered' },
        { status: 400 }
      );
    }

    // Create the lab
    const lab = await prisma.lab.create({
      data: { ...validatedData, ownerId: currentUser.userId },
    });

    // Create trial subscription (14 days)
    const trialPlan = await prisma.plan.findFirst({ where: { name: 'starter' } });
    if (trialPlan) {
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 14); // 14-day trial

      await prisma.subscription.create({
        data: {
          labId: lab.id,
          planId: trialPlan.id,
          status: 'TRIAL',
          startDate: new Date(),
          endDate, // Only fields that exist in schema
        },
      });
    }

    return NextResponse.json({
      lab,
      message: 'Laboratory registered successfully with trial subscription',
    });
  } catch (error: any) {
    console.error('Create lab error:', error);

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create laboratory' },
      { status: 500 }
    );
  }
}
