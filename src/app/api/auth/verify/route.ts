import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendVerificationSuccessEmail, sendAdminNewLabAlert } from '@/lib/mail';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // 1. Accept BOTH email and userId, but prioritize email for better UX
    const { email, userId, code } = body;

    if (!code) {
      return NextResponse.json({ error: 'Verification code is required' }, { status: 400 });
    }

    if (!email && !userId) {
      return NextResponse.json({ error: 'Email or User ID is required' }, { status: 400 });
    }

    // 2. Fetch User to get their exact ID safely
    let user;
    if (email) {
      user = await prisma.user.findUnique({
        where: { email: email.toLowerCase().trim() },
        include: { lab: true, staffLabs: { include: { lab: true } } }
      });
    } else if (userId) {
      user = await prisma.user.findUnique({
        where: { id: userId },
        include: { lab: true, staffLabs: { include: { lab: true } } }
      });
    }

    if (!user) {
      return NextResponse.json({ error: 'User not found. Please register again.' }, { status: 404 });
    }

    // 3. Fetch the OTP using the guaranteed accurate user.id
    const otpRecord = await prisma.oTP.findUnique({
      where: { userId: user.id },
    });

    if (!otpRecord) {
      // If no OTP exists but user is already verified, just let them through
      if (user.emailVerified) {
        return NextResponse.json({ success: true, message: 'Account is already verified' });
      }
      return NextResponse.json({ error: 'OTP not found. Please request a new code.' }, { status: 400 });
    }

    // 4. Validate Code & Expiry
    if (otpRecord.code !== code) {
      return NextResponse.json({ error: 'Invalid verification code' }, { status: 400 });
    }

    if (new Date() > otpRecord.expiresAt) {
      return NextResponse.json({ error: 'Verification code has expired. Please request a new one.' }, { status: 400 });
    }

    // 5. Safely extract Lab Name (if they have one yet)
    let resolvedLabId = null;
    let resolvedLabName = "Your Workspace";

    if (user.lab) {
      const primaryLab = Array.isArray(user.lab) ? user.lab[0] : user.lab;
      resolvedLabId = primaryLab?.id;
      resolvedLabName = primaryLab?.name || "Your Workspace";
    } else if (user.staffLabs && user.staffLabs.length > 0) {
      const staffLabRef = user.staffLabs[0];
      resolvedLabId = staffLabRef.labId;
      resolvedLabName = staffLabRef.lab?.name || "Your Workspace";
    }

    // 6. Mark User Active & Cleanup OTP Atomically
    const transactionOperations: any[] = [
      prisma.user.update({
        where: { id: user.id },
        data: { 
          isActive: true,
          emailVerified: true 
        }
      }),
      prisma.oTP.delete({ 
        where: { userId: user.id } 
      })
    ];

    // Only log activity if a lab is actually attached
    if (resolvedLabId) {
      transactionOperations.push(
        prisma.activityLog.create({
          data: {
            labId: resolvedLabId, 
            userId: user.id,
            action: 'EMAIL_VERIFIED',
            entity: 'USER',
            entityId: user.id,
            entityType: 'USER', 
            description: 'User successfully verified their email address via OTP.',
          }
        })
      );
    }

    await prisma.$transaction(transactionOperations);

    // ==========================================
    // 7. SEND SUCCESS & ADMIN EMAILS (NON-BLOCKING)
    // ==========================================
    try {
      // We wrap this in a self-executing async function so it doesn't block the API response
      (async () => {
        const config = await prisma.systemConfig.findFirst();
        const primaryAdminEmail = config?.systemEmail || 'globizhubcto@gmail.com';
        
        // Ensure we always notify the main admin, plus any dynamic system email
        const adminEmails = primaryAdminEmail !== 'admin@globizhub.com' 
          ? ['admin@globizhub.com', primaryAdminEmail] 
          : ['admin@globizhub.com'];

        await Promise.allSettled([
          sendVerificationSuccessEmail(user.email, user.name, resolvedLabName),
          sendAdminNewLabAlert(
            adminEmails as any, 
            resolvedLabName, 
            user.name, 
            user.email, 
            user.phone
          )
        ]);
      })().catch(err => console.error('Post-Verification Email Failed:', err));
    } catch (emailError) {
      // Catch any immediate synchronous errors in setting up the promises
      console.error('Email Dispatch Error:', emailError);
    }

    // 8. Return Success
    return NextResponse.json({ 
      success: true, 
      message: 'Account verified successfully!' 
    });

  } catch (error) {
    console.error("Verify Error:", error);
    return NextResponse.json({ error: 'An unexpected error occurred during verification' }, { status: 500 });
  }
}