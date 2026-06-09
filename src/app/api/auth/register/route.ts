import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hash } from 'bcryptjs';
import { addMinutes } from 'date-fns';
import nodemailer from 'nodemailer';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // 🚀 PIVOT UPDATE: Removed `planId`. Subscriptions are dead.
    const { name, email, password, phone } = body; 

    // 1. Check if user exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
    }

    const hashedPassword = await hash(password, 12);
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    // 2. Transaction: Create User + OTP
    const user = await prisma.$transaction(async (tx) => {
      
      // Create User with INITIAL Status
      const newUser = await tx.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          phone,
          role: 'LAB_OWNER',
          
          // ✅ CRITICAL PIVOT FIX: We deleted onboardingStatus and emailVerified.
          // They simply start as inactive until OTP is verified.
          isActive: false,                
        }
      });

      // Create OTP Record
      // (Note: Ensure the OTP model is in your schema. If TS complains, you can use (tx as any).oTP )
      await (tx as any).oTP.create({
        data: {
          userId: newUser.id,
          code: otpCode,
          type: 'EMAIL_VERIFICATION',
          expiresAt: addMinutes(new Date(), 15), // 15 min expiry
        }
      });

      return newUser;
    });

    // 3. Send Email via SMTP
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
        to: email,
        subject: 'Verify your Patholab Account',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
            <h2 style="color: #3b82f6; text-align: center;">Verify Your Email</h2>
            <p style="color: #333; font-size: 16px;">Hello ${name},</p>
            <p style="color: #555; font-size: 16px;">
              Welcome to the future of pathology management! Please use the verification code below to complete your registration.
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #1e293b; background: #f1f5f9; padding: 10px 20px; border-radius: 8px;">
                ${otpCode}
              </span>
            </div>
            <p style="color: #555; font-size: 14px;">This code is valid for 15 minutes.</p>
            <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">
            <p style="color: #888; font-size: 12px; text-align: center;">
              If you didn't request this code, you can safely ignore this email.
            </p>
          </div>
        `,
      };

      await transporter.sendMail(mailOptions);
      console.log(`[EMAIL] OTP sent to ${email}`);

    } catch (emailError) {
      console.error('SMTP Error:', emailError);
      // We don't rollback the user creation if email fails, 
      // the frontend allows "Resend OTP" which handles retry.
    }

    return NextResponse.json({ userId: user.id, email: user.email });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
  }
}