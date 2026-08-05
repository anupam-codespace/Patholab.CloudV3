import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword, generateToken, setAuthCookie } from '@/lib/auth';
import { loginSchema } from '@/lib/validation';
import { rateLimit, RateLimitError } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    // 🛡️ Rate limit: 10 login attempts per minute per IP
    await rateLimit(request, { windowMs: 60_000, max: 10, key: 'login' });

    const body = await request.json();
    const { email, password } = loginSchema.parse(body);
    
    // 1. Fetch User + Owner Lab OR Staff Profiles
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        lab: {
          include: {
            wallet: true,
            branches: { where: { isMainBranch: true } }
          }
        },
        staffLabs: {
          where: { isActive: true },
          include: {
            lab: { include: { wallet: true } },
            branch: true
          }
        }
      }
    });
    
    if (!user) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    
    const isValidPassword = await verifyPassword(password, user.password);
    if (!isValidPassword) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    
    // 2. Check User Status — allow LAB_OWNER during onboarding, allow all active staff
    if (!user.isActive) {
      if (user.role !== 'LAB_OWNER' || user.lab) {
        return NextResponse.json({ error: 'Account inactive. Contact your administrator.' }, { status: 403 });
      }
    }

    // 3. Resolve Lab and Branch Context
    let finalLabId: string | null = null;
    let finalBranchId: string | null = null;
    let activeLab: any = null;
    let permissions: string[] = [];

    if (user.role === 'LAB_OWNER') {
      finalLabId = user.lab?.id || null;
      finalBranchId = user.lab?.branches?.[0]?.id || null;
      activeLab = user.lab || null;
      permissions = ['ALL'];
    } else if (user.role === 'SUPER_ADMIN') {
      permissions = ['ALL'];
    } else if (user.role === 'PATIENT') {
      // Patients don't need lab context
    } else if (user.role === 'B2B_PARTNER') {
      // B2B partners — find their agency record to get labId
      const agency = await prisma.agency.findFirst({
        where: { userId: user.id },
        include: { lab: { select: { id: true, name: true } } },
      });
      if (agency) {
        finalLabId = agency.labId;
        activeLab = agency.lab;
      }
    } else {
      // STAFF (TECHNICIAN, RECEPTIONIST, LAB_MANAGER, PHLEBOTOMIST, DOCTOR, AGENCY)
      const primaryProfile = user.staffLabs[0];
      if (primaryProfile) {
        finalLabId = primaryProfile.labId;
        finalBranchId = primaryProfile.branchId || null;
        activeLab = primaryProfile.lab || null;
        permissions = primaryProfile.permissions || [];
      }
    }

    // 4. Staff MUST have a lab assigned
    if (user.role !== 'LAB_OWNER' && user.role !== 'SUPER_ADMIN' && user.role !== 'PATIENT' && !finalLabId) {
      return NextResponse.json({ 
        error: 'Your account is not assigned to any active lab. Contact your administrator.' 
      }, { status: 403 });
    }

    // 5. Generate JWT
    const token = await generateToken({
      id: user.id, 
      userId: user.id,
      email: user.email,
      role: user.role,
      labId: finalLabId,
      branchId: finalBranchId,
      isActive: user.isActive,
      permissions: permissions
    });
    
    await setAuthCookie(token);

    // 6. ALL lab roles go to /workspace — the workspace layout renders role-specific dashboards
    let redirectUrl = '/workspace';
    switch (user.role) {
      case 'SUPER_ADMIN':
        redirectUrl = '/admin';
        break;
      case 'PATIENT':
        redirectUrl = '/portal';
        break;
      case 'B2B_PARTNER':
        redirectUrl = '/b2b';
        break;
      default:
        redirectUrl = '/workspace';
        break;
    }
    
    return NextResponse.json({
      message: 'Login successful',
      redirect: redirectUrl, 
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        branchId: finalBranchId,
        lab: activeLab ? {
          id: activeLab.id,
          name: activeLab.name,
          isLisIntegrationPaid: activeLab.wallet?.isLisIntegrationPaid || false,
          wallet: activeLab.wallet ? {
            balance: Number(activeLab.wallet.balance),
            isActive: activeLab.wallet.isActive,
            validityEndDate: activeLab.wallet.validityEndDate
          } : null,
        } : null,
      },
    });

  } catch (error: any) {
    if (error instanceof RateLimitError) return error.toResponse();
    console.error('Login Error:', error);
    if (error.name === 'ZodError') return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 });
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
