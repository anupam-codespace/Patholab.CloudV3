import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';

// 1. Define Public Access Zones
const PUBLIC_PATHS = [
  '/login', '/register', '/verify-otp', '/forgot-password', 
  '/pricing', '/unauthorized', '/verify', '/upgrade', '/contact-us'
];

const GUEST_ONLY_PATHS = ['/login', '/register'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('token')?.value;

  // 2. Identify Request Zone
  const isPublicPath = 
    PUBLIC_PATHS.includes(pathname) || 
    pathname === '/' ||
    pathname.startsWith('/api/public/') ||
    pathname.startsWith('/book/') ||
    pathname.startsWith('/api/auth/') ||
    pathname.startsWith('/api/webhooks');

  // 3. Handle Authenticated Users (Redirect guests away from login)
  if (token && GUEST_ONLY_PATHS.includes(pathname)) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // 4. If public path, allow through immediately
  if (isPublicPath) {
    return NextResponse.next();
  }

  // 5. Protected Route Guard (No token = Redirect to Login)
  if (!token) {
    if (pathname.startsWith('/api')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // 6. Verify Session & Extract Multi-Tenant Context
  const payload = await verifyToken(token);
  if (!payload) {
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('token');
    return response;
  }

  // 7. Role-Based Access Control (RBAC) Logic
  const role = payload.role as string;
  const labId = payload.labId as string;
  const branchId = payload.branchId as string | null;

  // Define route permissions
  const allowedPaths: Record<string, string[]> = {
    SUPER_ADMIN: ['/admin', '/dashboard', '/workspace'],
    LAB_OWNER: ['/workspace', '/dashboard'],
    LAB_MANAGER: ['/workspace', '/dashboard'],
    TECHNICIAN: ['/workspace', '/dashboard'],
    RECEPTIONIST: ['/workspace', '/dashboard'],
    DOCTOR: ['/doctor', '/dashboard'],
    AGENCY: ['/agency', '/dashboard']
  };

  const userAllowedPaths = allowedPaths[role] || [];
  const isAuthorized = userAllowedPaths.some(path => pathname.startsWith(path));

  if (!isAuthorized && !pathname.startsWith('/api')) {
    return NextResponse.redirect(new URL('/unauthorized', request.url));
  }

  // 8. Inject Multi-Tenancy Headers for Server Components/API Routes
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-user-role', role);
  requestHeaders.set('x-lab-id', labId);
  if (branchId) requestHeaders.set('x-branch-id', branchId);

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

// 9. Matcher Configuration
export const config = {
  matcher: [
    // Intercept all paths except static assets
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)',
  ],
};