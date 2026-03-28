import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';
import { addMonths, addYears } from 'date-fns';
import nodemailer from 'nodemailer';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { 
      razorpay_payment_id, 
      razorpay_subscription_id, 
      razorpay_signature, 
      userId, 
      planId,
      labId 
    } = body;

    // 1. Validate Input
    if (!razorpay_payment_id || !razorpay_subscription_id || !razorpay_signature || !userId || !planId || !labId) {
      return NextResponse.json({ error: 'Missing required details' }, { status: 400 });
    }

    // 2. Verify Signature
    const text = razorpay_payment_id + '|' + razorpay_subscription_id;
    const generated_signature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
      .update(text)
      .digest('hex');

    if (generated_signature !== razorpay_signature) {
      return NextResponse.json({ error: 'Invalid Payment Signature' }, { status: 400 });
    }

    // 3. Get Plan Details
    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) throw new Error('Plan not found');

    const endDate = plan.billingCycle === 'YEARLY' 
      ? addYears(new Date(), 1) 
      : addMonths(new Date(), 1);

    // 4. Transaction: Activate & Return User Data
    const { user, lab } = await prisma.$transaction(async (tx) => {
      
      // A. Create Subscription
      const sub = await tx.subscription.create({
        data: {
          planId: plan.id,
          labId: labId,
          status: 'ACTIVE',
          startDate: new Date(),
          endDate: endDate,
          razorpaySubId: razorpay_subscription_id
        }
      });

      // B. Log Payment
      await tx.payment.create({
        data: {
          subscriptionId: sub.id,
          amount: plan.price,
          status: 'SUCCESS',
          razorpayPaymentId: razorpay_payment_id,
        }
      });

      // C. Activate Lab
      const updatedLab = await tx.lab.update({
        where: { id: labId },
        data: { isActive: true }
      });

      // D. Activate User (The Key Step)
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: { 
          isActive: true,           // ✅ Unlock Login
          onboardingStatus: 'COMPLETED', // ✅ Mark Flow Complete
          role: 'LAB_OWNER',
          emailVerified: true 
        }
      });

      return { user: updatedUser, lab: updatedLab };
    }, {
      maxWait: 10000, 
      timeout: 20000 
    });

    // 5. Send Welcome Email (Non-blocking)
    sendWelcomeEmail(user.email, user.name, lab.name).catch(console.error);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Payment Verification Error:', error);
    return NextResponse.json({ error: 'Payment verification failed' }, { status: 500 });
  }
}

// --- EMAIL HELPER ---
async function sendWelcomeEmail(email: string, name: string, labName: string) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: true,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL}/login`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { background-color: #3b82f6; padding: 30px; text-align: center; color: white; }
        .header h1 { margin: 0; font-size: 24px; }
        .content { padding: 30px; color: #334155; line-height: 1.6; }
        .details-box { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; margin: 20px 0; }
        .label { font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600; }
        .value { font-size: 16px; color: #0f172a; font-weight: 500; margin-bottom: 10px; }
        .btn { display: inline-block; background-color: #3b82f6; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; margin-top: 20px; }
        .footer { padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; background-color: #f8fafc; border-top: 1px solid #e2e8f0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Welcome to Patholab!</h1>
        </div>
        <div class="content">
          <p>Hello <strong>${name}</strong>,</p>
          <p>We are thrilled to have you onboard! Your subscription for <strong>${labName}</strong> is now active, and your laboratory account has been successfully set up.</p>
          
          <div class="details-box">
            <div class="label">Username / Login ID</div>
            <div class="value">${email}</div>
            
            <div class="label">Password</div>
            <div class="value">As set during registration</div>
            
            <div class="label">Portal URL</div>
            <div class="value"><a href="${loginUrl}" style="color: #3b82f6;">${loginUrl}</a></div>
          </div>

          <p>You can now access your dashboard to start managing patients, generating reports, and tracking your inventory.</p>
          
          <center>
            <a href="${loginUrl}" class="btn">Login to Dashboard</a>
          </center>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} Patholab SaaS. All rights reserved.<br>
          Need help? Contact patholab@globizhub.com
        </div>
      </div>
    </body>
    </html>
  `;

  await transporter.sendMail({
    from: `"Patholab Team" <${process.env.SMTP_USER}>`,
    to: email,
    subject: `Welcome to Patholab! Your Account is Ready 🚀`,
    html: htmlContent,
  });
}