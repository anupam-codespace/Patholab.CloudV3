import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    // 1. Audit Logging
    const user = await getCurrentUser();
    const ip = req.headers.get('x-forwarded-for') || 'unknown';

    if (user) {
      await prisma.activityLog.create({
        data: {
          userId: user.id, // Make sure this matches your schema (user.id instead of user.userId)
          action: 'LOGOUT',
          entity: 'SESSION',
          entityId: user.id,
          description: `User logged out from IP: ${ip}`,
        },
      }).catch(console.error);
    }

    // 2. Return a JSON success response (NOT a redirect)
    const response = NextResponse.json(
      { success: true, message: 'Logged out successfully' },
      { status: 200 }
    );

    // 3. DESTROY AUTH COOKIE
    response.cookies.set({
      name: 'token',
      value: '',
      httpOnly: true,
      expires: new Date(0), // Set to the past to instantly delete
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });

    return response;

  } catch (error) {
    console.error('Logout System Error:', error);
    return NextResponse.json(
      { success: false, message: 'Logout error' },
      { status: 500 }
    );
  }
}