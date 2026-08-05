import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, code, newPassword } = body;

    // 1. Basic Validation
    if (!email || !code || !newPassword) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (newPassword.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters long" }, { status: 400 });
    }

    // 2. Normalize Email
    const normalizedEmail = email.toLowerCase().trim();

    // 3. Find User
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        lab: true,
        staffLabs: true
      }
    });

    if (!user) {
      return NextResponse.json({ error: "Invalid request. User not found." }, { status: 400 });
    }

    // 4. Fetch the OTP Record
    const otpRecord = await prisma.oTP.findUnique({
      where: { userId: user.id },
    });

    if (!otpRecord || otpRecord.type !== "PASSWORD_RESET") {
      return NextResponse.json({ error: "Invalid or expired password reset request." }, { status: 400 });
    }

    // 5. Validate OTP Code & Expiry
    if (otpRecord.code !== code) {
      return NextResponse.json({ error: "Invalid verification code." }, { status: 400 });
    }

    if (new Date() > otpRecord.expiresAt) {
      return NextResponse.json({ error: "Verification code has expired. Please request a new one." }, { status: 400 });
    }

    // 6. Hash New Password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // 7. Safely extract Lab ID (if the user has completed lab setup)
    let resolvedLabId = null;
    if (user.lab) {
      // Handle both one-to-one or one-to-many array structures safely
      const primaryLab = Array.isArray(user.lab) ? user.lab[0] : user.lab;
      resolvedLabId = primaryLab?.id || null;
    } else if (user.staffLabs && user.staffLabs.length > 0) {
      resolvedLabId = user.staffLabs[0].labId || null;
    }

    // 8. Prepare Atomic Transaction
    const transactionOperations: any[] = [
      prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword }
      }),
      prisma.oTP.delete({
        where: { userId: user.id }
      })
    ];

    // 9. CONDITIONAL LOGGING: Only log if we have a labId to satisfy Prisma's schema
    if (resolvedLabId) {
      transactionOperations.push(
        prisma.activityLog.create({
          data: {
            labId: resolvedLabId, 
            userId: user.id,
            action: 'PASSWORD_RESET',
            entity: 'USER',
            entityId: user.id,
            entityType: 'USER',
            description: 'User successfully reset their password via OTP.',
          }
        })
      );
    }

    // Execute all database calls safely
    await prisma.$transaction(transactionOperations);

    // 10. Return Success
    return NextResponse.json({ 
      success: true, 
      message: "Password has been successfully reset. You can now log in." 
    });

  } catch (error: any) {
    console.error("Reset Password Server Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}