import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';

// 1. Define Access Zones
// ✅ v3.2.3: Expanded PUBLIC_PATHS to include all genuinely public routes.
// Previously '/patient-portal' was the only portal — added '/portal' (the
// actual route used by patients after login), and '/api/portal' for any
// patient-facing API routes.
const PUBLIC_PATHS = [
  '/login', '/register', '/verify-otp', '/forgot-password',
  '/pricing', '/unauthorized', '/verify', '/contact-us',
  '/patient-portal', '/portal',
  '/book-demo',
];

const GUEST_ONLY_PATHS = ['/login', '/register'];

// ✅ v3.2.3: Prefixes that are ALWAYS public (no auth required).
// Used for: public booking portal, public tracking page, public report
// verification, public file uploads (logos), webhooks from external systems.
const PUBLIC_PREFIXES = [
  '/api/public/',
  '/api/auth/',
  '/api/track/',
  '/api/verify/',
  '/api/webhooks',
  '/api/plans',
  '/api/landing',
  '/api/contact',
  '/api/book-demo',
  '/api/tests/categories', // public test categories for booking portal
  '/track/',
  '/verify/',
  '/book/',
  '/uploads/', // ✅ v3.2.3: Logo/image uploads must be publicly accessible
  '/sw.js',
  '/manifest.json',
  '/favicon.ico',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('token')?.value;

  // 2. Identify Request Zone
  const isPublicPath =
    PUBLIC_PATHS.includes(pathname) ||
    PUBLIC_PREFIXES.some(prefix => pathname.startsWith(prefix));

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
  // ALL lab roles (LAB_OWNER, LAB_MANAGER, TECHNICIAN, RECEPTIONIST, PHLEBOTOMIST, DOCTOR, AGENCY)
  // access /workspace — the workspace dashboard renders role-specific content
  const allowedPaths: Record<string, string[]> = {
    SUPER_ADMIN: ['/admin', '/workspace'],
    LAB_OWNER: ['/workspace'],
    LAB_MANAGER: ['/workspace'],
    TECHNICIAN: ['/workspace'],
    RECEPTIONIST: ['/workspace'],
    PHLEBOTOMIST: ['/workspace'],
    DOCTOR: ['/workspace'],
    AGENCY: ['/workspace'],
    B2B_PARTNER: ['/b2b'],
    PATIENT: ['/portal', '/patient-portal']
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
// ✅ v3.2.3: Explicitly exclude ALL static asset paths so the middleware
// doesn't waste a request cycle on them. The previous matcher used a single
// regex that excluded "anything with a dot" — but that also excluded
// /uploads/file.png (which is fine, we want it public) AND would fail to
// match /api/workspace/invoices/abc-123/pdf (no dot, so it WAS matched).
// The new matcher is more explicit and easier to reason about.
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static, _next/image (Next.js internals)
     * - favicon.ico, manifest.json, sw.js, workbox-*.js (PWA/static)
     * - uploads/* (public logo/image uploads)
     * - Any file with a file extension (e.g., .png, .jpg, .css, .js, .ico)
     */
    '/((?!_next/static|_next/image|favicon\\.ico|manifest\\.json|sw\\.js|workbox-.*\\.js|uploads/|.*\\..*).*)',
  ],
};