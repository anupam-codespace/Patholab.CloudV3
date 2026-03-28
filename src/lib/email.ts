// Email service using Nodemailer
// ==========================================
import nodemailer from 'nodemailer';

// Create transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: true, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

// Send email
export async function sendEmail(options: EmailOptions) {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || '"Patholab Support" <noreply@patholab.cloud>',
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });
    return { success: true };
  } catch (error) {
    console.error('Email sending failed:', error);
    return { success: false, error };
  }
}

// Send OTP email for verification
export async function sendOTPEmail(email: string, otp: string, name: string) {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .otp-box { background: white; border: 2px dashed #667eea; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px; }
          .otp-code { font-size: 36px; font-weight: bold; color: #667eea; letter-spacing: 8px; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔬 Patholab</h1>
            <p>Email Verification</p>
          </div>
          <div class="content">
            <p>Hi <strong>${name}</strong>,</p>
            <p>Thank you for registering with Patholab! Please verify your email address using the OTP below:</p>
            <div class="otp-box">
              <p style="margin: 0; color: #666;">Your OTP Code</p>
              <div class="otp-code">${otp}</div>
            </div>
            <p><strong>Note:</strong> This OTP will expire in 10 minutes.</p>
            <p>If you didn't request this verification, please ignore this email.</p>
          </div>
          <div class="footer">
            <p>© 2026 Patholab. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: 'Verify Your Email - Patholab',
    html,
    text: `Hi ${name}, Your OTP for email verification is: ${otp}. This OTP will expire in 10 minutes.`,
  });
}

// Send password reset OTP
export async function sendPasswordResetEmail(email: string, otp: string, name: string) {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .otp-box { background: white; border: 2px solid #f5576c; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px; }
          .otp-code { font-size: 36px; font-weight: bold; color: #f5576c; letter-spacing: 8px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔒 Password Reset</h1>
          </div>
          <div class="content">
            <p>Hi <strong>${name}</strong>,</p>
            <p>We received a request to reset your password. Use the OTP below to proceed:</p>
            <div class="otp-box">
              <p style="margin: 0; color: #666;">Reset OTP</p>
              <div class="otp-code">${otp}</div>
            </div>
            <p><strong>Security Note:</strong> This OTP will expire in 10 minutes.</p>
            <p>If you didn't request a password reset, please contact our support team immediately.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: 'Password Reset Request - Patholab',
    html,
    text: `Hi ${name}, Your OTP for password reset is: ${otp}. This OTP will expire in 10 minutes.`,
  });
}

// Send subscription activation email
export async function sendSubscriptionEmail(
  email: string,
  name: string,
  planName: string,
  startDate: Date,
  endDate: Date
) {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .plan-details { background: white; padding: 20px; border-left: 4px solid #11998e; margin: 20px 0; border-radius: 5px; }
          .button { display: inline-block; padding: 12px 30px; background: #11998e; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Subscription Activated!</h1>
          </div>
          <div class="content">
            <p>Hi <strong>${name}</strong>,</p>
            <p>Your subscription has been successfully activated! Welcome to Patholab.</p>
            <div class="plan-details">
              <h3 style="margin-top: 0;">📋 Subscription Details</h3>
              <p><strong>Plan:</strong> ${planName}</p>
              <p><strong>Start Date:</strong> ${startDate.toLocaleDateString('en-IN')}</p>
              <p><strong>End Date:</strong> ${endDate.toLocaleDateString('en-IN')}</p>
            </div>
            <p>You can now access all features of your plan. Get started by logging into your dashboard.</p>
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/login" class="button">Go to Dashboard</a>
            <p>If you have any questions, our support team is here to help!</p>
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: `Subscription Activated - ${planName}`,
    html,
  });
}

// Send subscription upgrade email
export async function sendUpgradeEmail(
  email: string,
  name: string,
  oldPlan: string,
  newPlan: string
) {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .upgrade-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⬆️ Plan Upgraded!</h1>
          </div>
          <div class="content">
            <p>Hi <strong>${name}</strong>,</p>
            <p>Great news! Your subscription has been successfully upgraded.</p>
            <div class="upgrade-box">
              <p style="color: #666; margin: 0;">Upgraded from</p>
              <h3 style="color: #999; margin: 10px 0;">${oldPlan}</h3>
              <p style="font-size: 24px; margin: 10px 0;">⬇️</p>
              <p style="color: #666; margin: 0;">to</p>
              <h3 style="color: #fa709a; margin: 10px 0;">${newPlan}</h3>
            </div>
            <p>You now have access to additional features and increased limits. Enjoy your enhanced experience!</p>
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: 'Subscription Upgraded Successfully',
    html,
  });
}

// Send payment receipt
export async function sendPaymentReceipt(
  email: string,
  name: string,
  amount: number,
  paymentId: string,
  planName: string
) {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .receipt { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .amount { font-size: 32px; color: #667eea; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>💳 Payment Received</h1>
          </div>
          <div class="content">
            <p>Hi <strong>${name}</strong>,</p>
            <p>Thank you for your payment! Here are the details:</p>
            <div class="receipt">
              <p><strong>Plan:</strong> ${planName}</p>
              <p><strong>Amount Paid:</strong> <span class="amount">₹${amount.toFixed(2)}</span></p>
              <p><strong>Payment ID:</strong> ${paymentId}</p>
              <p><strong>Date:</strong> ${new Date().toLocaleDateString('en-IN')}</p>
            </div>
            <p>Your payment has been processed successfully. This is your receipt for the transaction.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: 'Payment Receipt - Patholab',
    html,
  });
}

// Send subscription expiry reminder
export async function sendExpiryReminderEmail(
  email: string,
  name: string,
  daysLeft: number,
  planName: string
) {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .warning-box { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 5px; }
          .button { display: inline-block; padding: 12px 30px; background: #f5576c; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⏰ Subscription Expiring Soon</h1>
          </div>
          <div class="content">
            <p>Hi <strong>${name}</strong>,</p>
            <div class="warning-box">
              <p style="margin: 0;"><strong>⚠️ Your ${planName} subscription will expire in ${daysLeft} days!</strong></p>
            </div>
            <p>Don't let your service be interrupted. Renew now to continue enjoying all features.</p>
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/subscription" class="button">Renew Now</a>
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: `⚠️ Your subscription expires in ${daysLeft} days`,
    html,
  });
}

export default transporter;