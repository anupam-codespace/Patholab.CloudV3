// FILE: src/app/api/patients/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, getDataFromToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createPatientSchema } from '@/lib/validation';
import { ZodError } from 'zod';

// 🛑 FORCE DYNAMIC: Prevents caching issues on Production/aaPanel
export const dynamic = 'force-dynamic'; 

// GET: List Patients
export async function GET(request: NextRequest) {
  try {
    const userFromToken = await getDataFromToken(request);
    let currentUser = await getCurrentUser();
    let labId = currentUser?.labId;

    if (!labId && userFromToken && (userFromToken.userId || userFromToken.id)) {
      const uid = userFromToken.userId || userFromToken.id;
      const dbUser = await prisma.user.findUnique({
        where: { id: uid },
        include: {
          lab: true,
          staffLabs: { include: { lab: true } }
        }
      });
      const activeLab = dbUser?.lab || dbUser?.staffLabs[0]?.lab;
      if (activeLab) labId = activeLab.id;
    }

    // Security Check: Ensure User has a Lab ID
    if (!labId) {
      return NextResponse.json({ error: 'Not authenticated or no Lab assigned' }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1')); // Ensure min page is 1
    const limit = Math.max(1, parseInt(searchParams.get('limit') || '20'));
    
    // 🔒 ISOLATION: Always filter by labId
    const where: any = {
      labId: currentUser.labId,
      isActive: true,
    };
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } }, // Phone usually doesn't need insensitive
        { email: { contains: search, mode: 'insensitive' } },
        { patientId: { contains: search, mode: 'insensitive' } }, // ✅ Added search by Patient ID
      ];
    }
    
    const [patients, total] = await Promise.all([
      prisma.patient.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { tests: true } },
        },
      }),
      prisma.patient.count({ where }),
    ]);
    
    return NextResponse.json({
      patients,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get patients error:', error);
    return NextResponse.json({ error: 'Failed to fetch patients' }, { status: 500 });
  }
}

// POST: Create Patient
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser || !currentUser.labId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    const body = await request.json();
    const validatedData = createPatientSchema.parse(body);

    // 🔒 TRANSACTION: Prevents ID collision if 2 people register at once
    const result = await prisma.$transaction(async (tx) => {
      
      // 1. Get current count inside transaction
      const count = await tx.patient.count({
        where: { labId: currentUser.labId },
      });

      // 2. Generate ID
      const patientId = `PAT${(count + 1).toString().padStart(6, '0')}`;

      // 3. Create Patient
      const patient = await tx.patient.create({
        data: {
          ...validatedData,
          labId: currentUser.labId!, // We checked labId exists above
          patientId,
          // Ensure dates are saved correctly (strip time if needed)
          dateOfBirth: validatedData.dateOfBirth ? new Date(validatedData.dateOfBirth) : null,
        },
      });

      // 4. Log Activity inside transaction (so it only logs if create succeeds)
      await tx.activityLog.create({
        data: {
          userId: currentUser.userId,
          action: 'CREATE',
          entity: 'PATIENT',
          entityId: patient.id,
          description: `Patient registered: ${patient.name} (${patientId})`,
        },
      });

      return patient;
    });
    
    return NextResponse.json({ patient: result, message: 'Patient registered successfully' });

  } catch (error: any) {
    console.error('Create patient error:', error);
    
    // Handle Validation Errors
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    // Handle Unique Constraint (Just in case transaction fails slightly)
    if (error.code === 'P2002') {
       return NextResponse.json({ error: 'Patient already exists (Phone or Email)' }, { status: 409 });
    }
    
    return NextResponse.json({ error: 'Failed to register patient' }, { status: 500 });
  }
}