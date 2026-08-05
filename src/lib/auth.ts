// src/lib/auth.ts
// Authentication utilities
// ==========================================
import { hash, compare } from 'bcryptjs';
import { SignJWT, jwtVerify, JWTPayload as JoseJWTPayload } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

// Encode secret
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'fallback-secret-key-change-this'
);

// ✅ UPDATED: Payload type to include Branch Isolation & Enterprise Roles
export interface JWTPayload extends JoseJWTPayload {
  id?: string;                  
  userId: string;
  email: string;
  role: string;
  
  // 👇 Allow null here so new Lab Owners can log in to see the Setup Modal
  labId?: string | null;
  branchId?: string | null;     
  
  isActive?: boolean;           
  onboardingStatus?: string;    
  
  // 3-Tier Enterprise Security Guard
  permissions?: string[];
  unlockedFeatures?: string[];
  
  [key: string]: any;           
}

// =====================
// Password Utilities
// =====================
export async function hashPassword(password: string): Promise<string> {
  return hash(password, 12);
}

export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return compare(password, hashedPassword);
}

// =====================
// JWT Utilities
// =====================
export async function generateToken(payload: JWTPayload): Promise<string> {
  return new SignJWT(payload as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as JWTPayload;
  } catch {
    return null;
  }
}

// =====================
// API Helper (Crucial for Dashboard)
// =====================
export async function getDataFromToken(request: NextRequest): Promise<JWTPayload | null> {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) return null;
    return await verifyToken(token);
  } catch (error) {
    return null;
  }
}

// =====================
// OTP Utilities
// =====================
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// =====================
// Cookie Utilities
// =====================
export async function setAuthCookie(token: string) {
  const cookieStore = cookies();
  cookieStore.set('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  });
}

// Used in Server Components
export async function getCurrentUser(): Promise<JWTPayload | null> {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) return null;
    return await verifyToken(token);
  } catch {
    return null;
  }
}

// ✅ ADDED: Alias for getSession to match the new Enterprise layout files perfectly
export async function getSession(): Promise<JWTPayload | null> {
  return getCurrentUser();
}

export async function removeAuthCookie() {
  const cookieStore = cookies();
  cookieStore.delete('token');
}