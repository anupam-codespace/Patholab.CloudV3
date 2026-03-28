import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const { userId, code } = await req.json();

    // 1. Find OTP record linked to user
    const otpRecord = await prisma.oTP.findUnique({
      where: { userId },
    });

    if (!otpRecord) return NextResponse.json({ error: 'OTP not found' }, { status: 400 });

    // 2. Validate Code & Expiry
    if (otpRecord.code !== code) {
      return NextResponse.json({ error: 'Invalid code' }, { status: 400 });
    }

    if (new Date() > otpRecord.expiresAt) {
      return NextResponse.json({ error: 'Code expired' }, { status: 400 });
    }

    // 3. Mark Verified & Cleanup OTP
    // ⚠️ NOTE: We do NOT set isActive: true here. That happens after Payment.
    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { 
          emailVerified: true,
          onboardingStatus: 'VERIFIED' // ✅ Move to next step (Lab Setup)
        }
      }),
      prisma.oTP.delete({ where: { userId } }) // Clean up used OTP
    ]);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Verify Error:", error);
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}