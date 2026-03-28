import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hash } from 'bcryptjs';

export async function POST(req: Request) {
  try {
    const { email, otp, newPassword } = await req.json();

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });

    const record = await prisma.oTP.findFirst({
      where: { userId: user.id, type: 'PASSWORD_RESET' }
    });

    if (!record || record.code !== otp || new Date() > record.expiresAt) {
      return NextResponse.json({ error: 'Invalid or expired code' }, { status: 400 });
    }

    // Hash & Update
    const hashedPassword = await hash(newPassword, 12);
    
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword }
      }),
      prisma.oTP.delete({ where: { id: record.id } }) // Consume OTP
    ]);

    return NextResponse.json({ success: true });

  } catch (error) {
    return NextResponse.json({ error: 'Reset failed' }, { status: 500 });
  }
}