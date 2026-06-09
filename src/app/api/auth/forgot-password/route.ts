import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { addMinutes } from 'date-fns';
import nodemailer from 'nodemailer';

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Security: Prevent email enumeration attacks. Always return success.
      return NextResponse.json({ success: true }); 
    }

    // Generate 6-digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Store OTP in Database
    // Using (prisma as any) to bypass TS strictness if OTP model casing differs in Prisma client
    await (prisma as any).oTP.upsert({
      where: { userId: user.id }, 
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

    // Send Email via SMTP
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT),
        secure: true,
        auth: { 
          user: process.env.SMTP_USER, 
          pass: process.env.SMTP_PASS 
        }
      });

      const mailOptions = {
        from: '"Patholab Security" <patholab@globizhub.com>',
        to: email,
        subject: 'Reset Your Password - Patholab',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
            <h2 style="color: #ef4444; text-align: center;">Password Reset Request</h2>
            <p style="color: #333; font-size: 16px;">Hello ${user.name},</p>
            <p style="color: #555; font-size: 16px;">
              We received a request to reset your Patholab account password. Please use the verification code below to proceed.
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #1e293b; background: #f1f5f9; padding: 10px 20px; border-radius: 8px;">
                ${code}
              </span>
            </div>
            <p style="color: #555; font-size: 14px;">This code will expire in exactly <strong>10 minutes</strong>.</p>
            <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">
            <p style="color: #888; font-size: 12px; text-align: center;">
              If you did not request a password reset, please ignore this email or contact support if you have concerns.
            </p>
          </div>
        `
      };

      await transporter.sendMail(mailOptions);
      console.log(`[SECURITY] Password reset OTP sent to ${email}`);

    } catch (emailError) {
      console.error('SMTP Error during password reset:', emailError);
      // Even if SMTP fails, do not expose internal errors to the client to maintain security boundaries
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Forgot Password Error:', error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}