import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword, generateToken, setAuthCookie } from '@/lib/auth';
import { loginSchema } from '@/lib/validation';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = loginSchema.parse(body);
    
    // 1. Find User with Deep Nested Includes (For Owners)
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        lab: {
          include: {
            subscription: {
              include: { plan: true }
            },
          },
        },
      },
    });
    
    if (!user) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    
    const isValidPassword = await verifyPassword(password, user.password);
    if (!isValidPassword) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    
    // 2. CRITICAL UPDATE: Check Onboarding Status
    if (!user.isActive) {
       if (user.onboardingStatus === 'REGISTERED') {
          return NextResponse.json({ error: 'Please verify your email to continue.' }, { status: 403 });
       }
       if (user.onboardingStatus === 'VERIFIED') {
          return NextResponse.json({ error: 'Please complete your Lab Setup.' }, { status: 403 });
       }
       if (user.onboardingStatus === 'LAB_SETUP') {
          return NextResponse.json({ error: 'Payment pending. Please complete subscription.' }, { status: 403 });
       }
       return NextResponse.json({ error: 'Account inactive. Contact support.' }, { status: 403 });
    }

    // 3. 🚨 FETCH STAFF RECORD (Crucial for Multi-Branch)
    let finalLabId = user.lab?.id || null;
    let finalBranchId = null;

    // If the user is NOT the owner or super admin, they must be staff. Find their branch!
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'LAB_OWNER') {
      const staffRecord = await prisma.labStaff.findFirst({
        where: { userId: user.id, isActive: true }
      });

      if (!staffRecord) {
        return NextResponse.json({ error: 'Your staff account has been suspended or is unassigned.' }, { status: 403 });
      }

      finalLabId = staffRecord.labId;
      finalBranchId = staffRecord.branchId; // 👈 We caught the Branch ID!
    }

    // 4. Generate the Custom JWT with the Full Payload
    const token = await generateToken({
      id: user.id, // Included to prevent that 401 error
      userId: user.id,
      email: user.email,
      role: user.role,
      labId: finalLabId,         // Assigned correctly for both Owner and Staff
      branchId: finalBranchId,   // Specifically locks staff into their branch
      isActive: user.isActive,
      onboardingStatus: user.onboardingStatus,
    });
    
    await setAuthCookie(token);

    // 5. Determine Redirect URL based on Role
    let redirectUrl = '/dashboard'; 
    switch (user.role) {
      case 'SUPER_ADMIN':
        redirectUrl = '/admin';
        break;
      case 'LAB_OWNER':
      case 'LAB_MANAGER': // Managers usually share the main workspace UI
        redirectUrl = '/workspace';
        break;
      case 'TECHNICIAN':
        redirectUrl = '/technician';
        break;
      case 'RECEPTIONIST':
        redirectUrl = '/receptionist';
        break;
    }
    
    // 6. Return response
    return NextResponse.json({
      message: 'Login successful',
      redirect: redirectUrl, 
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        branchId: finalBranchId, // Helpful for the frontend context
        lab: user.lab ? {
          id: user.lab.id,
          name: user.lab.name,
          plan: {
             name: user.lab.subscription?.plan.displayName || 'Free',
             maxTests: user.lab.subscription?.plan.maxTests,
             features: user.lab.subscription?.plan.features,
          },
          status: user.lab.subscription?.status,
        } : null,
      },
    });

  } catch (error: any) {
    console.error('Login Error:', error);
    if (error.name === 'ZodError') return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 });
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}