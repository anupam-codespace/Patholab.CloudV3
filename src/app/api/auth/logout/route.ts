import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    // 1. Fetch User & IP for Audit Logging
    const user = await getCurrentUser();
    const ip = req.headers.get('x-forwarded-for') || 'unknown';

    if (user) {
      // Safely extract the ID from the token payload
      const validUserId = user.userId || user.id;

      if (validUserId) {
        await prisma.activityLog.create({
          data: {
            userId: validUserId,
            action: 'LOGOUT',
            entity: 'SESSION',
            entityId: validUserId,
            entityType: 'SESSION',
            description: `User logged out from IP: ${ip}`,
          },
        }).catch((err) => {
          // Non-blocking error catch: if logging fails, don't stop the user from logging out
          console.error('[AUDIT LOG ERROR] Failed to log logout event:', err);
        });
      }
    }

    // 2. Prepare JSON success response
    const response = NextResponse.json(
      { success: true, message: 'Logged out successfully' },
      { status: 200 }
    );

    // 3. DESTROY AUTH COOKIE SECURELY
    response.cookies.set({
      name: 'token',
      value: '',
      httpOnly: true,
      expires: new Date(0), // Instantly expires the cookie
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });

    return response;

  } catch (error) {
    console.error('Logout System Error:', error);
    return NextResponse.json(
      { success: false, message: 'An error occurred during logout' },
      { status: 500 }
    );
  }
}