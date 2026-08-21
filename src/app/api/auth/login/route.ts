import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword, generateToken, setAuthCookie } from '@/lib/auth';
import { loginSchema } from '@/lib/validation';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = loginSchema.parse(body);
    
    // 1. Enterprise Query: Fetch User + Owner Lab OR Staff Profiles
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        // A. If the user is a LAB_OWNER, fetch their direct lab & main branch
        lab: {
          include: {
            wallet: true, // 💰 Fetch the new Wallet system
            branches: {
              where: { isMainBranch: true }
            }
          }
        },
        // B. If the user is STAFF, fetch their active assignments
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
    
    // 2. Check User Status & Onboarding Bypass
    if (!user.isActive) {
       // Newly registered Lab Owners default to inactive until setup is complete.
       // We MUST allow them to log in so they can see the Lab Setup modal.
       if (user.role !== 'LAB_OWNER' || user.lab) {
         return NextResponse.json({ error: 'Account inactive. Contact your administrator.' }, { status: 403 });
       }
    }

    // 3. Resolve Lab and Branch Context Safely
    let finalLabId = null;
    let finalBranchId = null;
    let activeLab = null;
    let permissions: string[] = [];

    if (user.role === 'LAB_OWNER') {
      // Owners own the lab directly via the `lab` relation
      finalLabId = user.lab?.id || null;
      finalBranchId = user.lab?.branches?.[0]?.id || null;
      activeLab = user.lab || null;
      permissions = ['ALL']; // Owners implicitly have all permissions
    } else if (user.role !== 'SUPER_ADMIN' && user.role !== 'PATIENT') {
      // Staff are assigned via the LabStaff pivot table
      const primaryProfile = user.staffLabs[0];
      finalLabId = primaryProfile?.labId || null;
      finalBranchId = primaryProfile?.branchId || null;
      activeLab = primaryProfile?.lab || null;
      permissions = primaryProfile?.permissions || [];
    }

    // 4. Strict Check ONLY for Staff
    // Staff MUST have a lab assigned. Owners can log in with null to complete onboarding.
    if (user.role !== 'LAB_OWNER' && user.role !== 'SUPER_ADMIN' && user.role !== 'PATIENT' && !finalLabId) {
      return NextResponse.json({ 
        error: 'Your account is not assigned to any active lab or branch. Contact your Lab Manager.' 
      }, { status: 403 });
    }

    // 5. Generate the Custom JWT with the Full Payload
    const token = await generateToken({
      id: user.id, 
      userId: user.id,
      email: user.email,
      role: user.role,
      labId: finalLabId,         // Expected to be null for fresh registrations
      branchId: finalBranchId,   // Expected to be null for fresh registrations
      isActive: user.isActive,
      permissions: permissions
    });
    
    await setAuthCookie(token);

    // 6. Determine Redirect URL based on Role
    let redirectUrl = '/dashboard'; 
    switch (user.role) {
      case 'SUPER_ADMIN':
        redirectUrl = '/admin';
        break;
      case 'LAB_OWNER':
      case 'LAB_MANAGER': 
        redirectUrl = '/workspace';
        break;
      case 'TECHNICIAN':
        redirectUrl = '/technician';
        break;
      case 'RECEPTIONIST':
        redirectUrl = '/receptionist';
        break;
      case 'PATIENT':
        redirectUrl = '/portal';
        break;
    }
    
    // 7. Return response with Wallet Info for the Dashboard UI
    return NextResponse.json({
      message: 'Login successful',
      token: token,
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
    console.error('Login Error:', error);
    if (error.name === 'ZodError') return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 });
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}