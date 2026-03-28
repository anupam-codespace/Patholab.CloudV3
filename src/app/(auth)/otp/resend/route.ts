import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { addMinutes } from 'date-fns';

export async function POST(req: Request) {
  try {
    const { userId } = await req.json();
    const newCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Upsert ensures we update existing OTP or create new if missing
    await prisma.oTP.upsert({
      where: { userId },
      update: {
        code: newCode,
        expiresAt: addMinutes(new Date(), 15)
      },
      create: {
        userId,
        code: newCode,
        type: 'EMAIL_VERIFICATION',
        expiresAt: addMinutes(new Date(), 15)
      }
    });

    console.log(`[RESEND] New OTP for ${userId}: ${newCode}`);
    return NextResponse.json({ success: true });

  } catch (error) {
    return NextResponse.json({ error: 'Resend failed' }, { status: 500 });
  }
}