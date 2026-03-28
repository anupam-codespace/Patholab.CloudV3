import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { addMinutes } from 'date-fns';
import nodemailer from 'nodemailer';

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Security: Don't reveal if user exists. Fake success.
      return NextResponse.json({ success: true }); 
    }

    // Generate OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Store OTP (Reuse your OTP model)
    await prisma.oTP.upsert({
      where: { userId: user.id }, // Assuming userId is unique in OTP table or use a composite key logic
      create: {
        userId: user.id,
        code,
        type: 'PASSWORD_RESET',
        expiresAt: addMinutes(new Date(), 10)
      },
      update: {
        code,
        type: 'PASSWORD_RESET',
        expiresAt: addMinutes(new Date(), 10)
      }
    });

    // Send Email
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: true,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    });

    await transporter.sendMail({
      from: `"Patholab Security" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Reset Your Password',
      html: `<p>Your password reset code is: <strong>${code}</strong>. Valid for 10 minutes.</p>`
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}