import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hash } from 'bcryptjs';

export async function POST(req: Request) {
  try {
    const { email, otp, newPassword } = await req.json();

    // 1. Fetch User
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    // 2. Fetch OTP and validate
    // Using (prisma as any) to handle potentially varying model names in the client
    const record = await (prisma as any).oTP.findFirst({
      where: { userId: user.id, type: 'PASSWORD_RESET' }
    });

    if (!record || record.code !== otp || new Date() > record.expiresAt) {
      return NextResponse.json({ error: 'Invalid or expired code' }, { status: 400 });
    }

    // 3. Hash Password & Update within Transaction
    const hashedPassword = await hash(newPassword, 12);
    
    await prisma.$transaction([
      // Update Password
      prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword }
      }),
      // Delete used OTP
      (prisma as any).oTP.delete({ 
        where: { id: record.id } 
      }),
      // ✅ ENTERPRISE AUDIT: Log this security event
      prisma.activityLog.create({
        data: {
          userId: user.id,
          action: 'PASSWORD_RESET',
          entity: 'USER',
          entityId: user.id,
          description: 'User successfully reset their password via OTP.',
        }
      })
    ]);

    return NextResponse.json({ success: true, message: 'Password updated successfully' });

  } catch (error) {
    console.error('Password Reset Error:', error);
    return NextResponse.json({ error: 'Reset failed' }, { status: 500 });
  }
}