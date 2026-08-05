import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendOTPEmail } from '@/lib/mail';

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

    // 1. CRITICAL FIX: Normalize email to prevent case-sensitivity mismatches
    const normalizedEmail = email.toLowerCase().trim();

    // 2. Find the User
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found. Please register." }, { status: 404 });
    }

    // Prevent abuse: Don't send OTPs if they are already verified
    if (user.emailVerified) {
      return NextResponse.json({ error: "Account is already verified. Please log in." }, { status: 400 });
    }

    // 3. Generate new OTP & Expiry (10 minutes)
    const otpCode = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); 

    // 4. Atomically Upsert the OTP Record
    // This overwrites any existing expired or unused code tied to this user
    await prisma.oTP.upsert({
      where: { userId: user.id },
      update: { 
        code: otpCode, 
        expiresAt,
        type: "EMAIL_VERIFICATION"
      },
      create: { 
        userId: user.id, 
        code: otpCode, 
        expiresAt, 
        type: "EMAIL_VERIFICATION" 
      },
    });

    // 5. Send the Email via your centralized Mailer
    const { success, error } = await sendOTPEmail(normalizedEmail, otpCode, user.name);

    if (!success) {
      console.error("Resend OTP Email API Error:", error);
      return NextResponse.json({ 
        error: "Failed to send the new code. Please check your email configuration." 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: "New verification code sent to your email!" 
    });

  } catch (error: any) {
    console.error("Resend OTP Server Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}