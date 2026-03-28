import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';

const publicRoutes = ['/', '/login', '/register', '/verify-otp', '/forgot-password', '/pricing'];
const authRoutes = ['/login', '/register'];

const publicApiPrefixes = [
  '/api/auth',
  '/api/payment',
  '/api/lab',
  '/api/landing',
  '/api/book-demo',
  '/api/plans',
  // '/patient-portal',
  '/terms-conditions',
  '/api/webhooks',
  '/privacy-policy',
  '/shipping-policy',
  '/contact-us',
  '/refund-policy',
  '/book-demo',
  '/pages'

  
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('token')?.value;

  // -----------------------------------------------------------
  // 1. REDIRECT LOGGED-IN USERS (Moved to TOP)
  // -----------------------------------------------------------
  // If user has a token and tries to visit Login/Register, move them to dashboard
  if (token && authRoutes.includes(pathname)) {
    const payload = await verifyToken(token);
    
    if (payload) {
      const role = payload.role as string;
      const dashboardRoutes: Record<string, string> = {
        SUPER_ADMIN: '/admin',
        LAB_OWNER: '/lab-owner/patients', // ✅ Redirects to Patients
        TECHNICIAN: '/technician',
        RECEPTIONIST: '/receptionist',
      };
      
      return NextResponse.redirect(
        new URL(dashboardRoutes[role] || '/', request.url)
      );
    }
  }

  // -----------------------------------------------------------
  // 2. CHECK IF ROUTE IS PUBLIC
  // -----------------------------------------------------------
  if (
    publicRoutes.includes(pathname) || 
    publicApiPrefixes.some(prefix => pathname.startsWith(prefix))
  ) {
    return NextResponse.next();
  }

  // -----------------------------------------------------------
  // 3. CHECK TOKEN FOR PROTECTED ROUTES
  // -----------------------------------------------------------
  if (!token) {
    if (pathname.startsWith('/api')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const payload = await verifyToken(token);
  if (!payload) {
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('token');
    return response;
  }

  // -----------------------------------------------------------
  // 4. ROLE BASED ACCESS
  // -----------------------------------------------------------
  const role = payload.role as string;
  
  if (pathname.startsWith('/admin') && role !== 'SUPER_ADMIN') {
    return NextResponse.redirect(new URL('/unauthorized', request.url));
  }
  
  if (pathname.startsWith('/lab-owner') && role !== 'LAB_OWNER') {
    return NextResponse.redirect(new URL('/unauthorized', request.url));
  }



  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*|api/payments/webhook).*)',
  ],
};