// FILE: src/app/api/labs/setup/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      userId,
      labName,
      licenseNumber,
      gstNumber,
      address,
      city,
      state,
      pincode,
      phone,
      email,
    } = body;

    // Transaction to create lab & link subscription
    await prisma.$transaction(async (tx) => {

      // A. Create the Lab Entity
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
          isActive: true,
        },
      });

      // B. Find the latest TRIAL subscription for this lab (if any)
      const pendingSub = await tx.subscription.findFirst({
        where: {
          labId: lab.id,   // Subscription linked to this lab
          status: 'TRIAL', // Valid enum value
        },
        orderBy: { createdAt: 'desc' },
      });

      // If pending subscription exists, mark it ACTIVE
      if (pendingSub) {
        await tx.subscription.update({
          where: { id: pendingSub.id },
          data: {
            status: 'ACTIVE', // Valid enum value
          },
        });
      }

      // C. Update User Role to LAB_OWNER
      await tx.user.update({
        where: { id: userId },
        data: { role: 'LAB_OWNER', isActive: true },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Lab Setup Error:', error);
    return NextResponse.json(
      { error: 'Failed to create lab' },
      { status: 500 }
    );
  }
}
