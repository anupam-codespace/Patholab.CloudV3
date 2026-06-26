// =========================================================================
// Centralized Email Service (Powered by Resend)
// Optimized for Patholab.cloud Wallet Architecture
// =========================================================================
import { Resend } from 'resend';

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY);
const SENDER_EMAIL = process.env.EMAIL_FROM || 'Patholab.cloud <noreply@patholab.cloud>';

interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

// =========================================================================
// 1. CORE SENDER FUNCTION
// =========================================================================
export async function sendEmail({ to, subject, html, text }: EmailOptions) {
  try {
    const data = await resend.emails.send({
      from: SENDER_EMAIL,
      to,
      subject,
      html,
      text: text || subject, // Fallback text
    });
    
    return { success: true, data };
  } catch (error) {
    console.error('[RESEND_EMAIL_ERROR]', error);
    return { success: false, error };
  }
}

// =========================================================================
// 2. MASTER HTML WRAPPER (Future-Proofing)
// This ensures all your emails look perfectly identical and professional.
// =========================================================================
function generateEmailHtml(headerTitle: string, headerColor: string, bodyContent: string) {
  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style>
          body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #334155; -webkit-font-smoothing: antialiased; }
          .wrapper { width: 100%; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); margin-top: 40px; margin-bottom: 40px; border: 1px solid #e2e8f0; }
          .header { background: ${headerColor}; padding: 32px 24px; text-align: center; }
          .header h1 { margin: 0; color: #ffffff; font-size: 24px; font-weight: 800; letter-spacing: -0.025em; }
          .content { padding: 32px 24px; line-height: 1.6; font-size: 16px; }
          .button { display: inline-block; background-color: ${headerColor}; color: #ffffff !important; font-weight: 600; padding: 12px 28px; text-decoration: none; border-radius: 8px; margin: 24px 0; }
          .footer { padding: 24px; text-align: center; font-size: 13px; color: #94a3b8; background-color: #f8fafc; border-top: 1px solid #e2e8f0; }
          .highlight-box { background-color: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; text-align: center; margin: 24px 0; }
        </style>
      </head>
      <body>
        <div class="wrapper">
          <div class="header">
            <h1>${headerTitle}</h1>
          </div>
          <div class="content">
            ${bodyContent}
          </div>
          <div class="footer">
            <p>Powered by <strong>Patholab.cloud</strong><br/>The Smart Choice for Diagnostic Centers.</p>
            <p style="margin-top: 10px;">© ${new Date().getFullYear()} Patholab. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

// =========================================================================
// 3. AUTHENTICATION EMAILS
// =========================================================================

export async function sendOTPEmail(email: string, otp: string, name: string) {
  const content = `
    <p>Hi <strong>${name}</strong>,</p>
    <p>Thank you for registering with Patholab.cloud. Please use the verification code below to confirm your email address:</p>
    <div class="highlight-box">
      <p style="margin: 0 0 8px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; color: #64748b;">Your OTP Code</p>
      <div style="font-size: 40px; font-weight: 800; color: #4f46e5; letter-spacing: 8px;">${otp}</div>
    </div>
    <p style="font-size: 14px; color: #64748b;">⚠️ This code will expire in 10 minutes.</p>
    <p>If you didn't request this code, you can safely ignore this email.</p>
  `;

  return sendEmail({
    to: email,
    subject: 'Your Patholab Verification Code',
    html: generateEmailHtml('🔬 Patholab Security', 'linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%)', content),
  });
}

export async function sendPasswordResetEmail(email: string, otp: string, name: string) {
  const content = `
    <p>Hi <strong>${name}</strong>,</p>
    <p>We received a request to reset your password. Use the OTP below to proceed:</p>
    <div class="highlight-box">
      <div style="font-size: 40px; font-weight: 800; color: #e11d48; letter-spacing: 8px;">${otp}</div>
    </div>
    <p style="font-size: 14px; color: #64748b;">⚠️ This code will expire in 10 minutes.</p>
    <p>If you didn't request a password reset, please secure your account immediately.</p>
  `;

  return sendEmail({
    to: email,
    subject: 'Password Reset Request',
    html: generateEmailHtml('🔒 Reset Password', 'linear-gradient(135deg, #e11d48 0%, #be123c 100%)', content),
  });
}

// =========================================================================
// 4. FINANCIAL EMAILS (Wallet Architecture)
// =========================================================================

export async function sendWalletRechargeReceipt(email: string, name: string, amount: number, newBalance: number, txnId: string) {
  const content = `
    <p>Hi <strong>${name}</strong>,</p>
    <p>Your wallet recharge was successful! Your lab operations are ready to scale.</p>
    <div class="highlight-box" style="text-align: left;">
      <p style="margin: 4px 0;"><strong>Recharge Amount:</strong> ₹${amount.toFixed(2)}</p>
      <p style="margin: 4px 0;"><strong>New Wallet Balance:</strong> ₹${newBalance.toFixed(2)}</p>
      <p style="margin: 4px 0;"><strong>Transaction ID:</strong> ${txnId}</p>
      <p style="margin: 4px 0;"><strong>Date:</strong> ${new Date().toLocaleDateString('en-IN')}</p>
    </div>
    <p>With our Pay-As-You-Go model (₹2.5/patient), you only pay when you generate revenue. No hidden fees, no shadow limits.</p>
    <div style="text-align: center;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" class="button">Go to Dashboard</a>
    </div>
  `;

  return sendEmail({
    to: email,
    subject: 'Wallet Recharge Successful - Patholab',
    html: generateEmailHtml('💳 Payment Receipt', 'linear-gradient(135deg, #059669 0%, #10b981 100%)', content),
  });
}

export async function sendLowBalanceWarning(email: string, name: string, currentBalance: number) {
  const content = `
    <p>Hi <strong>${name}</strong>,</p>
    <p>This is a quick automated alert regarding your Patholab Wallet.</p>
    <div class="highlight-box" style="background-color: #fffbeb; border-color: #fde68a;">
      <p style="margin: 0; color: #b45309; font-size: 18px; font-weight: bold;">
        ⚠️ Your current balance is critically low: ₹${currentBalance.toFixed(2)}
      </p>
    </div>
    <p>To avoid any disruption in registering new patients or generating reports, please recharge your wallet soon.</p>
    <div style="text-align: center;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/settings/billing" class="button" style="background-color: #d97706;">Recharge Wallet Now</a>
    </div>
  `;

  return sendEmail({
    to: email,
    subject: 'Action Required: Low Wallet Balance',
    html: generateEmailHtml('⚠️ Low Balance Alert', 'linear-gradient(135deg, #d97706 0%, #b45309 100%)', content),
  });
}

// =========================================================================
// 5. PATIENT NOTIFICATION EMAILS
// =========================================================================

export async function sendReportReadyEmail(patientEmail: string, patientName: string, labName: string, reportLink: string) {
  const content = `
    <p>Dear <strong>${patientName}</strong>,</p>
    <p>Your medical test reports from <strong>${labName}</strong> are now verified and ready for viewing.</p>
    <div style="text-align: center;">
      <a href="${reportLink}" class="button">View & Download Report</a>
    </div>
    <p style="font-size: 14px; color: #64748b;">
      If the button above does not work, please copy and paste the following link securely into your browser:<br/>
      <a href="${reportLink}" style="color: #3b82f6; word-break: break-all;">${reportLink}</a>
    </p>
    <p>Thank you for choosing ${labName}. Wishing you good health!</p>
  `;

  return sendEmail({
    to: patientEmail,
    subject: `Your Lab Report is Ready - ${labName}`,
    html: generateEmailHtml('📄 Report Ready', 'linear-gradient(135deg, #0f172a 0%, #334155 100%)', content),
  });
}