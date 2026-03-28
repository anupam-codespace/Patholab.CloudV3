import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, subject, message } = body;

    // 1. Save to Database (Reusing Lead table for tracking)
    await prisma.lead.create({
      data: {
        name,
        email,
        phone: 'N/A', // Not required for general contact
        labName: 'N/A',
        message: `[Subject: ${subject}] ${message}`,
        source: 'CONTACT_FORM'
      }
    });

    // 2. Email Notification
    await sendEmail({
      to: process.env.SALES_EMAIL || 'admin@patholab.cloud',
      subject: `📩 New Contact: ${subject}`,
      html: `
        <p><strong>From:</strong> ${name} (${email})</p>
        <p><strong>Subject:</strong> ${subject}</p>
        <p><strong>Message:</strong></p>
        <blockquote style="background: #f1f5f9; padding: 10px;">${message}</blockquote>
      `
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Server Error' }, { status: 500 });
  }
}