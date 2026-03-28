import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { 
      userId, labName, licenseNumber, gstNumber, 
      address, city, state, pincode, phone, email 
    } = body;

    // Use a transaction to ensure both operations succeed or fail together
    const result = await prisma.$transaction(async (tx) => {
      
      // 1. Create the Lab Record
      const lab = await tx.lab.create({
        data: {
          name: labName,
          licenseNumber,
          gstNumber,
          address,
          city,
          state,
          pincode,
          phone,
          email,
          ownerId: userId,
          isActive: false, // Remains inactive until Subscription Payment
        }
      });

      // 2. Update User Progress
      // This flags the user as having finished Step 4
      await tx.user.update({
        where: { id: userId },
        data: { 
          onboardingStatus: 'LAB_SETUP' 
        }
      });

      return lab;
    });

    return NextResponse.json({ labId: result.id });

  } catch (error: any) {
    console.error("Lab Setup Error:", error);
    
    // Check for unique constraint violation (e.g., License Number already taken)
    if (error.code === 'P2002') {
        return NextResponse.json({ error: 'This License Number is already registered.' }, { status: 409 });
    }

    return NextResponse.json({ error: 'Failed to create lab' }, { status: 500 });
  }
}