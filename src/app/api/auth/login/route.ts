import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword, generateToken, setAuthCookie } from '@/lib/auth';
import { loginSchema } from '@/lib/validation';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = loginSchema.parse(body);
    
    // 1. Find User with Deep Nested Includes
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        lab: {
          include: {
            subscription: {
              include: {
                plan: true 
              }
            },
          },
        },
      },
    });
    
    if (!user) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    
    const isValidPassword = await verifyPassword(password, user.password);
    if (!isValidPassword) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    
    // ✅ CRITICAL UPDATE: Check Onboarding Status
    if (!user.isActive) {
       // Return specific errors so Frontend knows where to redirect
       if (user.onboardingStatus === 'REGISTERED') {
          return NextResponse.json({ error: 'Please verify your email to continue.' }, { status: 403 });
       }
       if (user.onboardingStatus === 'VERIFIED') {
          return NextResponse.json({ error: 'Please complete your Lab Setup.' }, { status: 403 });
       }
       if (user.onboardingStatus === 'LAB_SETUP') {
          return NextResponse.json({ error: 'Payment pending. Please complete subscription.' }, { status: 403 });
       }
       // Fallback for banned users or generic inactive state
       return NextResponse.json({ error: 'Account inactive. Contact support.' }, { status: 403 });
    }

    const token = await generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      labId: user.lab?.id,
    });
    
    await setAuthCookie(token);

    // 2. Determine Redirect URL based on Role
    let redirectUrl = '/dashboard'; // Default fallback
    switch (user.role) {
      case 'SUPER_ADMIN':
        redirectUrl = '/admin';
        break;
      case 'LAB_OWNER':
        redirectUrl = '/workspace';
        break;
      case 'TECHNICIAN':
        redirectUrl = '/technician';
        break;
      case 'RECEPTIONIST':
        redirectUrl = '/receptionist';
        break;
    }
    
    // 3. Return response with redirect URL
    return NextResponse.json({
      message: 'Login successful',
      redirect: redirectUrl, 
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
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