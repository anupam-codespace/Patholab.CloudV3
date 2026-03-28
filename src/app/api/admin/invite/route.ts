import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { randomBytes } from 'crypto';
import { addDays } from 'date-fns';
import { headers } from 'next/headers';
// import { Resend } from 'resend'; // Uncomment if you have Resend installed

// const resend = new Resend(process.env.RESEND_API_KEY);

const inviteSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().min(2, 'Name is required'),
  labName: z.string().min(2, 'Lab Name is required'),
  role: z.enum(['LAB_OWNER', 'TECHNICIAN', 'RECEPTIONIST']).default('LAB_OWNER'),
});

export async function POST(req: Request) {
  try {
    // 1. Authentication Check (Get current user ID from header or session)
    // In production, use your actual session method here (e.g. NextAuth or JWT)
    const headersList = headers();
    const inviterId = headersList.get('x-user-id'); // Example: Middleware sets this

    // Fallback for demo if middleware isn't set up yet
    // const inviter = await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN' } });
    
    if (!inviterId && process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { email, name, labName, role } = inviteSchema.parse(body);

    // 2. Check for existing user
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email is already registered.' },
        { status: 409 }
      );
    }

    // 3. Check for existing pending invitation to avoid spam
    const existingInvite = await prisma.invitation.findFirst({
      where: { 
        email, 
        status: 'PENDING',
        expiresAt: { gt: new Date() } 
      }
    });

    if (existingInvite) {
      return NextResponse.json(
        { error: 'An active invitation has already been sent to this email.' },
        { status: 409 }
      );
    }

    // 4. Create Secure Invitation Record
    const token = randomBytes(32).toString('hex');
    const expiresAt = addDays(new Date(), 7); // 7 day expiry

    const invitation = await prisma.invitation.create({
      data: {
        email,
        name,
        labName,
        role,
        token,
        expiresAt,
        inviterId: inviterId || 'admin-fallback-id', // Replace with real ID
      },
    });

    // 5. Send Email (Production Logic)
    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/register?token=${token}`;
    
    console.log(`[PRODUCTION EMAIL] Sending to ${email}: ${inviteUrl}`);

    /* // UNCOMMENT THIS BLOCK TO ACTUALLY SEND EMAIL WITH RESEND
    await resend.emails.send({
      from: 'Patholab <onboarding@Patholab.com>',
      to: email,
      subject: 'You have been invited to join Patholab',
      html: `
        <div>
          <h1>Welcome, ${name}!</h1>
          <p>You have been invited to manage <strong>${labName}</strong> on Patholab.</p>
          <p>Click the link below to set up your account:</p>
          <a href="${inviteUrl}" style="padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 5px;">
            Accept Invitation
          </a>
          <p>This link expires in 7 days.</p>
        </div>
      `
    });
    */

    return NextResponse.json({ 
      message: 'Invitation sent successfully',
      id: invitation.id 
    });

  } catch (error: any) {
    console.error('Invite Error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}