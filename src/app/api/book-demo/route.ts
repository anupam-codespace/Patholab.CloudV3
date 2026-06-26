import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/mail';
import { sendSlackAlert } from '@/lib/slack'; // ✅ Import the Slack Helper

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, phone, labName, message } = body;

    // 1. Validation
    if (!name || !email || !phone) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 2. Save to Database
    const lead = await prisma.lead.create({
      data: {
        name,
        email,
        phone,
        labName,
        message,
        source: 'WEBSITE_DEMO'
      }
    });

    // ==========================================
    // 🔔 SLACK NOTIFICATION (New Addition)
    // ==========================================
    const slackMsg = `
*🎯 New Demo Request!*
--------------------------------
*Name:* ${name}
*Lab:* ${labName || 'N/A'}
*Phone:* ${phone}
*Email:* ${email}

*Message:* _${message || 'No message provided'}_
`;

    // Fire Slack Alert (Non-blocking)
    sendSlackAlert(slackMsg, 'info');


    // ==========================================
    // EMAIL 1: Notification to Sales Team
    // ==========================================
    const salesEmailHtml = `
      <div style="font-family: sans-serif; padding: 20px;">
        <h2 style="color: #2563eb;">New Demo Request</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Phone:</strong> ${phone}</p>
        <p><strong>Lab Name:</strong> ${labName || 'N/A'}</p>
        <div style="background: #f1f5f9; padding: 10px; border-radius: 5px;">
           <strong>Message:</strong><br/> ${message || 'N/A'}
        </div>
        <hr style="margin: 20px 0; border: 0; border-top: 1px solid #e2e8f0;" />
        <p style="color: #64748b; font-size: 12px;">This lead has been saved to your Super Admin dashboard.</p>
      </div>
    `;

    // ==========================================
    // EMAIL 2: Confirmation to User
    // ==========================================
    const userEmailHtml = `
      <div style="font-family: sans-serif; padding: 20px; color: #333;">
        <h2 style="color: #2563eb;">Demo Request Received!</h2>
        <p>Hi ${name},</p>
        <p>Thank you for booking a demo with <strong>Patholab</strong>. We have successfully received your request.</p>
        
        <div style="background-color: #f0f9ff; border-left: 4px solid #2563eb; padding: 15px; margin: 20px 0;">
           <p style="margin: 0; font-size: 14px; color: #555;">Our representative will review your requirements and call you very soon from the following number:</p>
           <p style="margin: 10px 0 0 0; font-size: 20px; font-weight: bold; color: #1e40af;">
             📞 +91 8402010207
           </p>
        </div>

        <p>We look forward to transforming your lab management experience.</p>
        <br/>
        <p style="font-size: 14px; color: #666;">Best Regards,<br/><strong>Team Patholab</strong></p>
      </div>
    `;

    // 3. Send Both Emails (Fire and forget)
    Promise.all([
      sendEmail({
        to: process.env.SALES_EMAIL || 'admin@patholab.cloud',
        subject: `🎯 New Lead: ${labName || name}`,
        html: salesEmailHtml
      }),
      sendEmail({
        to: email,
        subject: `✅ Demo Request Confirmation - Patholab`,
        html: userEmailHtml
      })
    ]).catch(err => console.error("Email sending failed:", err));

    return NextResponse.json({ success: true, message: 'Request received' });

  } catch (error) {
    console.error("Demo Request Error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}