import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import nodemailer from 'nodemailer';

export async function POST(req: Request) {
  try {
    const { userId, code } = await req.json();

    // 1. Fetch OTP record 
    const otpRecord = await (prisma as any).oTP.findUnique({
      where: { userId },
    });

    if (!otpRecord) {
      return NextResponse.json({ error: 'OTP not found' }, { status: 400 });
    }

    // 2. Fetch User & Lab details
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { 
        lab: true,        
        staffLabs: { include: { lab: true } } // Include lab to get the name
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 400 });
    }

    // Safely extract Lab ID and Lab Name
    let resolvedLabId = null;
    let resolvedLabName = "Your Lab";

    if (user.lab) {
      const primaryLab = Array.isArray(user.lab) ? user.lab[0] : user.lab;
      resolvedLabId = primaryLab?.id;
      resolvedLabName = primaryLab?.name || "Your Lab";
    } else if (user.staffLabs && user.staffLabs.length > 0) {
      const staffLabRef = (user.staffLabs as any)[0];
      resolvedLabId = staffLabRef.labId;
      resolvedLabName = staffLabRef.lab?.name || "Your Lab";
    }

    // 3. Validate Code & Expiry
    if (otpRecord.code !== code) {
      return NextResponse.json({ error: 'Invalid code' }, { status: 400 });
    }

    if (new Date() > otpRecord.expiresAt) {
      return NextResponse.json({ error: 'Code expired' }, { status: 400 });
    }

    // 4. Mark User Active & Cleanup OTP
    const transactionOperations: any[] = [
      prisma.user.update({
        where: { id: userId },
        data: { isActive: true }
      }),
      (prisma as any).oTP.delete({ 
        where: { userId } 
      })
    ];

    if (resolvedLabId) {
      transactionOperations.push(
        prisma.activityLog.create({
          data: {
            labId: resolvedLabId, 
            userId: userId,
            action: 'EMAIL_VERIFIED',
            entity: 'USER',
            entityId: userId,
            
            // ✅ FIX: Added the missing required field
            entityType: 'USER', 
            
            description: 'User successfully verified their email address via OTP.',
          }
        })
      );
    }

    await prisma.$transaction(transactionOperations);

    // ==========================================
    // 5. SEND SUCCESS & ADMIN EMAILS (NON-BLOCKING)
    // ==========================================
    try {
      const config = await prisma.systemConfig.findFirst();
      const adminEmail = config?.systemEmail || 'globizhubcto@gmail.com';

      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT),
        secure: true,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      // --- EMAIL 1: TO THE NEW USER ---
      const userMailOptions = {
        from: '"Patholab.cloud" <patholab@globizhub.com>',
        to: user.email,
        subject: 'Welcome to Patholab.cloud - Account Verified! 🎉',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
            <div style="text-align: center; margin-bottom: 20px;">
              <h2 style="color: #2563eb; margin: 0;">Congratulations, ${user.name}!</h2>
              <p style="color: #16a34a; font-weight: bold; margin-top: 5px;">Your account has been successfully verified.</p>
            </div>
            
            <p style="color: #475569; font-size: 16px; line-height: 1.5;">
              Welcome to <strong>Patholab.cloud</strong>! Your workspace for <strong>${resolvedLabName}</strong> is now active and ready to use. 
            </p>

            <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #e2e8f0;">
              <h3 style="margin-top: 0; color: #0f172a; font-size: 16px;">Your Login Details:</h3>
              <p style="margin: 5px 0; color: #334155;"><strong>Login URL:</strong> <a href="https://app.patholab.cloud/login" style="color: #2563eb;">app.patholab.cloud/login</a></p>
              <p style="margin: 5px 0; color: #334155;"><strong>User ID:</strong> ${user.email}</p>
              <p style="margin: 5px 0; color: #334155;"><strong>Password:</strong> <em>(The secure password you created during registration)</em></p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <p style="color: #475569; font-size: 15px; margin-bottom: 15px;">To unlock full professional features and start generating reports, please log in and recharge your wallet.</p>
              <a href="https://app.patholab.cloud/workspace/wallet/recharge" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; display: inline-block;">Go to Dashboard</a>
            </div>

            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
            <p style="color: #94a3b8; font-size: 12px; text-align: center;">
              Need help? Reply to this email or contact our support team.
            </p>
          </div>
        `,
      };

      // --- EMAIL 2: TO THE ADMIN ---
      const adminMailOptions = {
        from: '"Patholab System Alert" <patholab@globizhub.com>',
        to: `admin@globizhub.com, ${adminEmail !== 'admin@globizhub.com' ? adminEmail : ''}`,
        subject: `New Lab Registered: ${resolvedLabName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
            <h2 style="color: #0f172a;">New Lab Registration Alert 🚀</h2>
            <p style="color: #475569; font-size: 15px;">A new user has just completed registration and verified their email address.</p>
            
            <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
              <tr><td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; color: #64748b; width: 120px;">Lab Name:</td><td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #0f172a;">${resolvedLabName}</td></tr>
              <tr><td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; color: #64748b;">Owner Name:</td><td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #0f172a;">${user.name}</td></tr>
              <tr><td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; color: #64748b;">Email:</td><td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #0f172a;">${user.email}</td></tr>
              <tr><td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; color: #64748b;">Phone:</td><td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #0f172a;">${user.phone || 'N/A'}</td></tr>
              <tr><td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; color: #64748b;">Time:</td><td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #0f172a;">${new Date().toLocaleString()}</td></tr>
            </table>
          </div>
        `,
      };

      // Send both emails in parallel for faster execution
      await Promise.allSettled([
        transporter.sendMail(userMailOptions),
        transporter.sendMail(adminMailOptions)
      ]);

    } catch (emailError) {
      // We wrap this in a catch block so that if SMTP fails (e.g., bad password, network issue), 
      // the user still gets successfully verified and logged in.
      console.error('Post-Verification Email Failed:', emailError);
    }

    return NextResponse.json({ success: true, message: 'Account verified successfully' });

  } catch (error) {
    console.error("Verify Error:", error);
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}