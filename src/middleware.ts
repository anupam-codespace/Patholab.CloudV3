import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';

// 1. Define Access Zones
const PUBLIC_PATHS = [
  '/login', '/register', '/verify-otp', '/forgot-password', 
  '/pricing', '/unauthorized', '/verify', '/contact-us', '/patient-portal'
];

const GUEST_ONLY_PATHS = ['/login', '/register'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('token')?.value;

  // 2. Identify Request Zone
  const isPublicPath = 
    PUBLIC_PATHS.includes(pathname) || 
    pathname.startsWith('/api/public/') ||
    pathname.startsWith('/api/auth/') ||
    pathname.startsWith('/verify') ||
    pathname.startsWith('/book') ||
    pathname.startsWith('/api/webhooks');

  // 3. No Token Handling
  if (!token) {
    if (isPublicPath) {
      return NextResponse.next();
    }
    // Protect API and UI routes
    if (pathname.startsWith('/api')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // 4. Verify Session (Token Exists)
  const payload = await verifyToken(token);
  if (!payload) {
    if (isPublicPath || pathname === '/login') {
      const response = NextResponse.next();
      response.cookies.delete('token');
      return response;
    }
    if (pathname.startsWith('/api')) {
      const response = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      response.cookies.delete('token');
      return response;
    }
    // Token is invalid/expired. Clear it and redirect to login.
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('token');
    return response;
  }

  const role = payload.role as string;
  
  // 5. Guest Paths Redirect (Send logged-in users to their correct home instead of hardcoded /dashboard)
  if (GUEST_ONLY_PATHS.includes(pathname)) {
    if (role === 'SUPER_ADMIN') return NextResponse.redirect(new URL('/admin', request.url));
    if (role === 'PATIENT') return NextResponse.redirect(new URL('/portal', request.url));
    if (role === 'B2B_PARTNER') return NextResponse.redirect(new URL('/b2b', request.url));

    // All Lab Staff & Owners go to Workspace
    return NextResponse.redirect(new URL('/workspace', request.url)); 
  }

  // Allow public paths to proceed (like the homepage) even if logged in
  if (isPublicPath) {
    return NextResponse.next();
  }

  // 6. Role-Based Access Control (RBAC) Logic
  const allowedPaths: Record<string, string[]> = {
    SUPER_ADMIN: ['/admin', '/workspace'],
    LAB_OWNER: ['/workspace'],
    LAB_MANAGER: ['/workspace'],
    TECHNICIAN: ['/workspace'],
    RECEPTIONIST: ['/workspace'],
    DOCTOR: ['/doctor'],
    AGENCY: ['/agency'],
    B2B_PARTNER: ['/b2b'],
    PATIENT: ['/portal']
  };

  const userAllowedPaths = allowedPaths[role] || [];
  const isAuthorized = userAllowedPaths.some(path => pathname.startsWith(path));

  // Block unauthorized access
  if (!isAuthorized && !pathname.startsWith('/api')) {
    return NextResponse.redirect(new URL('/unauthorized', request.url));
  }

  // 7. Inject Multi-Tenancy Headers for Server Components/API Routes
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-user-role', role);
  
  // Safely inject IDs (Only if they exist, prevents "null" string errors during onboarding)
  if (payload.labId) requestHeaders.set('x-lab-id', payload.labId as string);
  if (payload.branchId) requestHeaders.set('x-branch-id', payload.branchId as string);

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

// 8. Matcher Configuration
export const config = {
  matcher: [
    // Intercept all paths except static assets, images, and Next.js internals
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)',
  ],
};