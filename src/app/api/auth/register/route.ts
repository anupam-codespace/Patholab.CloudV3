import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hash } from 'bcryptjs';
import { addMinutes } from 'date-fns';
import nodemailer from 'nodemailer';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // 🚀 PIVOT UPDATE: Accept labName from the updated frontend
    const { labName, name, email, password, phone } = body; 

    if (!email || !password || !name) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const hashedPassword = await hash(password, 12);
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = addMinutes(new Date(), 15); // 15 min expiry

    // 1. Check if user already exists
    const existing = await prisma.user.findUnique({ where: { email } });
    let targetUserId = "";

    // ==========================================
    // SCENARIO A: USER EXISTS
    // ==========================================
    if (existing) {
      // If they are already active/verified, block registration
      if (existing.isActive) {
        return NextResponse.json(
          { error: 'Email already registered and verified. Please log in.' }, 
          { status: 409 }
        );
      }

      // If they are NOT verified, update their details and send them a fresh OTP
      const updatedUser = await prisma.$transaction(async (tx) => {
        // Update their info in case they typed a different password/phone this time
        const user = await tx.user.update({
          where: { id: existing.id },
          data: { name, phone, password: hashedPassword }
        });

        // Wipe old OTPs and create a new one
        await (tx as any).oTP.deleteMany({ where: { userId: existing.id } });
        
        await (tx as any).oTP.create({
          data: {
            userId: existing.id,
            code: otpCode,
            type: 'EMAIL_VERIFICATION',
            expiresAt,
          }
        });

        // Update Lab name if it exists via relation
        if (labName) {
          try {
            const userLab = await (tx as any).lab.findFirst({ where: { userId: existing.id } });
            if (userLab) {
              await (tx as any).lab.update({
                where: { id: userLab.id },
                data: { name: labName, phone }
              });
            }
          } catch (e) {
            // Silently ignore if relation varies
          }
        }

        return user;
      });

      targetUserId = updatedUser.id;
    } 
    
    // ==========================================
    // SCENARIO B: BRAND NEW USER
    // ==========================================
    else {
      const newUser = await prisma.$transaction(async (tx) => {
        // Create User with INITIAL Status
        const createdUser = await tx.user.create({
          data: {
            name,
            email,
            password: hashedPassword,
            phone,
            role: 'LAB_OWNER',
            isActive: false, // Starts as inactive until OTP is verified
            
            // ✅ Link the Lab creation directly through Prisma relation
            ...(labName && {
              lab: {
                create: {
                  name: labName,
                  email: email,
                  phone: phone,
                }
              }
            })
          }
        });

        // Create OTP Record
        await (tx as any).oTP.create({
          data: {
            userId: createdUser.id,
            code: otpCode,
            type: 'EMAIL_VERIFICATION',
            expiresAt, 
          }
        });

        return createdUser;
      });

      targetUserId = newUser.id;
    }

    // ==========================================
    // 3. SEND VERIFICATION EMAIL VIA SMTP
    // ==========================================
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

    // Return the ID so the frontend can redirect to /verify?userId=...
    return NextResponse.json({ success: true, userId: targetUserId, email: email }, { status: 201 });

  } catch (error) {
    console.error("Registration Logic Error:", error);
    return NextResponse.json({ error: 'Registration failed. Please try again.' }, { status: 500 });
  }
}