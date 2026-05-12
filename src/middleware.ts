import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';

const publicRoutes = [
  '/', 
  '/login', 
  '/register', 
  '/verify-otp', 
  '/forgot-password', 
  '/pricing',
  '/unauthorized',
  '/verify'
];

// Routes that logged-in users should NEVER see (they get bounced to dashboard)
const guestOnlyRoutes = ['/', '/login', '/register'];

const publicPrefixes = [
  '/api/auth',
  '/api/payment',
  '/api/lab',
  '/api/landing',
  '/api/book-demo',
  '/api/plans',
  '/terms-conditions',
  '/api/webhooks', // Keeps it universally whitelisted just in case
  '/privacy-policy',
  '/shipping-policy',
  '/contact-us',
  '/refund-policy',
  '/book-demo',
  '/pages',
  '/verify' 
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('token')?.value;

  // -----------------------------------------------------------
  // 1. PUBLIC ROUTES & LOGGED-IN REDIRECTS
  // -----------------------------------------------------------
  if (
    publicRoutes.includes(pathname) || 
    publicPrefixes.some(prefix => pathname.startsWith(prefix))
  ) {
    // If user is already logged in and tries to access Login, Register, or the Root '/'
    if (token && guestOnlyRoutes.includes(pathname)) {
      const payload = await verifyToken(token);
      
      if (payload) {
        // Everyone goes to the common Switchboard Dashboard
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    }
    return NextResponse.next();
  }

  // -----------------------------------------------------------
  // 2. CHECK TOKEN FOR PROTECTED ROUTES
  // -----------------------------------------------------------
  if (!token) {
    if (pathname.startsWith('/api')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // -----------------------------------------------------------
  // 3. VERIFY TOKEN & EXTRACT PAYLOAD
  // -----------------------------------------------------------
  const payload = await verifyToken(token);
  if (!payload) {
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('token');
    return response;
  }

  const role = payload.role as string;
  const labId = payload.labId as string | undefined;
  const branchId = payload.branchId as string | undefined;

  // -----------------------------------------------------------
  // 4. LEGACY ROUTE CATCHER (Fixes the Unauthorized Bug)
  // -----------------------------------------------------------
  // If your frontend login pushes a user to an old URL, intercept and redirect to dashboard
  const legacyPaths = ['/lab-owner', '/technician', '/receptionist'];
  if (legacyPaths.some(path => pathname === path || pathname.startsWith(`${path}/`))) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // -----------------------------------------------------------
  // 5. UNIFIED ROLE-BASED ACCESS CONTROL (Workspace)
  // -----------------------------------------------------------
  const allowedPaths: Record<string, string[]> = {
    SUPER_ADMIN: ['/admin', '/dashboard'],
    LAB_OWNER: ['/workspace', '/dashboard'],
    LAB_MANAGER: ['/workspace', '/dashboard'],
    TECHNICIAN: ['/workspace', '/dashboard'],
    RECEPTIONIST: ['/workspace', '/dashboard'],
    DOCTOR: ['/doctor', '/dashboard'], 
    AGENCY: ['/agency', '/dashboard']  
  };

  const userAllowedPaths = allowedPaths[role] || [];
  
  const isAuthorized = userAllowedPaths.some(path => 
    pathname === path || pathname.startsWith(`${path}/`)
  );

  // If they try to access a protected root folder they don't own, block them
  if (!isAuthorized && !pathname.startsWith('/api')) {
    return NextResponse.redirect(new URL('/unauthorized', request.url));
  }

  // -----------------------------------------------------------
  // 6. INJECT MULTI-TENANCY HEADERS
  // -----------------------------------------------------------
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-user-role', role);
  
  if (labId) requestHeaders.set('x-lab-id', labId);
  if (branchId) requestHeaders.set('x-branch-id', branchId);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - api/webhooks (bypasses middleware entirely for fast WooCommerce syncing)
     * - .*\\..* (matches any file with a dot, e.g., .svg, .png)
     */
    '/((?!_next/static|_next/image|favicon.ico|api/webhooks|.*\\..*).*)',
  ],
};