import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { addMinutes } from 'date-fns';
import nodemailer from 'nodemailer';

export async function POST(req: Request) {
  try {
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // 1. Fetch the user to get their email and name
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // 2. Generate a new 6-digit OTP
    const newCode = Math.floor(100000 + Math.random() * 900000).toString();

    // 3. Upsert ensures we update existing OTP or create a new one if missing
    // Using (prisma as any) to prevent TypeScript casing errors
    await (prisma as any).oTP.upsert({
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

    // 4. Send the new OTP via Email
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT),
        secure: true,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      const mailOptions = {
        from: '"Patholab.cloud Support" <patholab@globizhub.com>',
        to: user.email,
        subject: 'Your New Verification Code',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
            <h2 style="color: #3b82f6; text-align: center;">New Verification Code</h2>
            <p style="color: #333; font-size: 16px;">Hello ${user.name},</p>
            <p style="color: #555; font-size: 16px;">
              You recently requested a new verification code for your Patholab account. Please use the code below:
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #1e293b; background: #f1f5f9; padding: 10px 20px; border-radius: 8px;">
                ${newCode}
              </span>
            </div>
            <p style="color: #555; font-size: 14px;">This code is valid for exactly 15 minutes.</p>
            <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">
            <p style="color: #888; font-size: 12px; text-align: center;">
              If you didn't request this code, you can safely ignore this email.
            </p>
          </div>
        `,
      };

      await transporter.sendMail(mailOptions);
      console.log(`[RESEND OTP] New OTP sent to ${user.email}`);

    } catch (emailError) {
      console.error('SMTP Error during Resend OTP:', emailError);
      // We don't block the frontend response, but the email delivery failed
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Resend OTP Error:', error);
    return NextResponse.json({ error: 'Failed to resend OTP' }, { status: 500 });
  }
}