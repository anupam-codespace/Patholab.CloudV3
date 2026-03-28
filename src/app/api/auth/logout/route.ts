import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function POST(req: NextRequest) {
  try {
    // 1. Audit Logging (Security)
    // We capture who is logging out before we delete their session
    const user = await getCurrentUser();
    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    if (user) {
      await prisma.activityLog.create({
        data: {
          userId: user.userId,
          action: 'LOGOUT',
          entity: 'SESSION',
          entityId: user.userId,
          description: `User logged out from IP: ${ip}`,        },
      }).catch(console.error); // Non-blocking logging
    }

    // 2. Prepare the Redirect URL
    // We want to move the user to the login page immediately
    const loginUrl = new URL('/login', req.url);

    // 3. Create the Redirect Response
    // Status 303 (See Other) is standard for redirecting after a POST request
    const response = NextResponse.redirect(loginUrl, { status: 303 });

    // 4. "NUCLEAR" CACHE CLEARING
    // This tells the browser to wipe LocalStorage, SessionStorage, and Cache
    response.headers.set(
      'Clear-Site-Data',
      '"cookies", "storage", "executionContexts"'
    );

    // 5. DESTROY AUTH COOKIE (Immediate Expiration)
    response.cookies.set({
      name: 'token',
      value: '',
      httpOnly: true,
      expires: new Date(0), // Set date to 1970
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });

    // 6. CLEAR SERVER CACHE
    // Ensure the next page load fetches fresh data
    response.headers.set('Cache-Control', 'no-store, max-age=0');
    revalidatePath('/', 'layout'); // Purge Next.js Server Cache

    return response;

  } catch (error) {
    console.error('Logout System Error:', error);
    // Even if error, force redirect to login to avoid "stuck" state
    return NextResponse.redirect(new URL('/login', req.url));
  }
}