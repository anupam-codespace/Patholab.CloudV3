import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const { userId, code } = await req.json();

    // 1. Find OTP record 
    // Using (prisma as any) to bypass potential casing mismatch in Prisma client
    const otpRecord = await (prisma as any).oTP.findUnique({
      where: { userId },
    });

    if (!otpRecord) {
      return NextResponse.json({ error: 'OTP not found' }, { status: 400 });
    }

    // 2. Validate Code & Expiry
    if (otpRecord.code !== code) {
      return NextResponse.json({ error: 'Invalid code' }, { status: 400 });
    }

    if (new Date() > otpRecord.expiresAt) {
      return NextResponse.json({ error: 'Code expired' }, { status: 400 });
    }

    // 3. Mark User Active & Cleanup OTP
    // 🚀 PIVOT UPDATE: We now set isActive: true immediately upon verification.
    // This allows the user to log in and proceed to Lab Setup.
    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { 
          isActive: true, 
        }
      }),
      (prisma as any).oTP.delete({ 
        where: { userId } 
      }),
      // ✅ ENTERPRISE AUDIT: Log this successful verification
      prisma.activityLog.create({
        data: {
          userId,
          action: 'EMAIL_VERIFIED',
          entity: 'USER',
          entityId: userId,
          description: 'User successfully verified their email address via OTP.',
        }
      })
    ]);

    return NextResponse.json({ success: true, message: 'Account verified successfully' });

  } catch (error) {
    console.error("Verify Error:", error);
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}