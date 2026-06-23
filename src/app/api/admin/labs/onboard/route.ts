import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { hash } from 'bcryptjs';
import { Role, SubStatus } from '@prisma/client';

// Strict Validation Schema
const onboardSchema = z.object({
  labName: z.string().min(2, 'Lab name is required'),
  licenseNumber: z.string().min(3, 'License number is required'),
  ownerName: z.string().min(2, 'Owner name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(10, 'Valid phone number is required'),
  city: z.string().min(2),
  state: z.string().min(2),
  planId: z.string().optional(), // Optional: Assign a specific plan immediately
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = onboardSchema.parse(body);

    // 1. Check for duplicates (Email or License)
    const existingUser = await prisma.user.findUnique({ where: { email: data.email } });
    if (existingUser) return NextResponse.json({ error: 'User with this email already exists' }, { status: 409 });

    const existingLab = await prisma.lab.findUnique({ where: { licenseNumber: data.licenseNumber } });
    if (existingLab) return NextResponse.json({ error: 'License number already registered' }, { status: 409 });

    // 2. Generate Temporary Password (In prod, send this via email)
    const tempPassword = Math.random().toString(36).slice(-8);
    const hashedPassword = await hash(tempPassword, 12);

    // 3. Find Default Plan (Free/Basic) if none provided
    const defaultPlan = await prisma.plan.findFirst({
      where: data.planId ? { id: data.planId } : { name: 'FREE' } 
    }) || await prisma.plan.findFirst(); 

    if (!defaultPlan) return NextResponse.json({ error: 'No subscription plans configured in system' }, { status: 500 });

    // 4. ATOMIC TRANSACTION: Create User + Lab + Subscription + Wallet
    const result = await prisma.$transaction(async (tx) => {
      // A. Create User
      const user = await tx.user.create({
        data: {
          email: data.email,
          name: data.ownerName,
          password: hashedPassword,
          role: Role.LAB_OWNER,
          phone: data.phone,
          emailVerified: true, 
          isActive: true,
        }
      });

      // B. Create Lab
      const lab = await tx.lab.create({
        data: {
          name: data.labName,
          licenseNumber: data.licenseNumber,
          ownerId: user.id,
          address: 'Update Address', // Placeholder
          city: data.city,
          state: data.state,
          pincode: '000000',
          phone: data.phone,
          email: data.email,
          isActive: true,
        }
      });

      // C. Assign Subscription (For Module/Feature Access)
      await tx.subscription.create({
        data: {
          labId: lab.id,
          planId: defaultPlan.id,
          status: SubStatus.TRIAL,
          startDate: new Date(),
          endDate: new Date(new Date().setMonth(new Date().getMonth() + 1)), // 1 Month Trial
        }
      });

      // D. Provision Pay-As-You-Go Wallet (NEW)
      const oneYearFromNow = new Date();
      oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

      await tx.wallet.create({
        data: {
          labId: lab.id,
          balance: 0,          // Starts at ₹0, requiring immediate recharge or admin credit
          status: "ACTIVE", 
          validityEndDate: oneYearFromNow, // 1-year default validity
        }
      });

      return { user, lab };
    });

    // 5. In Production: Send Welcome Email via Resend/SendGrid
    console.log(`[EMAIL QUEUE] Welcome ${data.email}. Temp Password: ${tempPassword}`);

    return NextResponse.json({
      message: 'Lab onboarded successfully with active wallet',
      credentials: { email: data.email, tempPassword }, 
      labId: result.lab.id
    });

  } catch (error: any) {
    console.error('Onboarding Error:', error);
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}