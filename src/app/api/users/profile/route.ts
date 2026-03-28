import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch fresh data from DB
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        name: true,
        email: true, 
        phone: true, 
        avatar: true,
        // Explicitly excluding password
      }
    });

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ user: dbUser });
  } catch (error) {
    console.error("Profile GET Error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();

    // ✅ Explicitly destructure to prevent payload mix-ups
    const { name, phone, email, avatar } = body;

    // Optional: Validation to prevent saving an email in the phone field again
    if (phone && phone.includes('@')) {
       return NextResponse.json({ error: "Invalid phone number format" }, { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        name: name,
        phone: phone, // Updates the phone column
        email: email, // ✅ ALLOWED: Updates the email column (To fix empty/wrong email)
        avatar: avatar,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        avatar: true,
      }
    });

    return NextResponse.json({ user: updatedUser, message: "Profile updated successfully" });
  } catch (error) {
    console.error("Profile PUT Error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}