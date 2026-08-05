import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendPasswordResetEmail } from '@/lib/mail';

// Helper to generate a 6-digit OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // 1. Normalize email to prevent case-sensitivity mismatches
    const normalizedEmail = email.toLowerCase().trim();

    // 2. Find the User
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });

    if (!user) {
      // UX Choice: For B2B platforms, it's better to explicitly tell them the account doesn't exist
      // so they don't sit around waiting for an email.
      return NextResponse.json({ error: "No account found with this email address." }, { status: 404 });
    }

    // 3. Generate OTP & Expiry (10 minutes)
    const otpCode = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); 

    // 4. Atomically Upsert the OTP Record
    // Note: We strictly flag this as a 'PASSWORD_RESET' type so it can't be used to bypass email verification
    await prisma.oTP.upsert({
      where: { userId: user.id },
      update: { 
        code: otpCode, 
        expiresAt,
        type: "PASSWORD_RESET"
      },
      create: { 
        userId: user.id, 
        code: otpCode, 
        expiresAt, 
        type: "PASSWORD_RESET" 
      },
    });

    // 5. Send the Centralized Email
    const { success, error } = await sendPasswordResetEmail(normalizedEmail, otpCode, user.name);

    if (!success) {
      console.error("Forgot Password Email API Error:", error);
      return NextResponse.json({ 
        error: "Failed to send reset email. Please contact support or try again later." 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: "Password reset code sent to your email!" 
    });

  } catch (error: any) {
    console.error("Forgot Password Server Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}