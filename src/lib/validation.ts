// FILE: src/lib/validation.ts
// Zod validation schemas
// ==========================================
import { z } from 'zod';

// Auth schemas
export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  phone: z.string().regex(/^[6-9]\d{9}$/, 'Invalid phone number'),
  role: z.enum(['LAB_OWNER', 'TECHNICIAN', 'RECEPTIONIST']).optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const verifyOTPSchema = z.object({
  email: z.string().email('Invalid email address'),
  otp: z.string().length(6, 'OTP must be 6 digits'),
});

// Lab schemas
export const createLabSchema = z.object({
  name: z.string().min(3, 'Lab name must be at least 3 characters'),
  address: z.string().min(10, 'Address must be at least 10 characters'),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
  pincode: z.string().regex(/^\d{6}$/, 'Invalid pincode'),
  phone: z.string().regex(/^[6-9]\d{9}$/, 'Invalid phone number'),
  email: z.string().email('Invalid email address'),
  licenseNumber: z.string().min(5, 'License number is required'),
  registrationNo: z.string().optional(),
  taxId: z.string().optional(),
});

// Patient schemas
export const createPatientSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  phone: z.string().regex(/^[6-9]\d{9}$/, 'Invalid phone number'),
  dateOfBirth: z.string().optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
  bloodGroup: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().regex(/^\d{6}$/, 'Invalid pincode').optional(),
});

// Test schemas
export const createTestSchema = z.object({
  patientId: z.string().min(1, 'Patient is required'),
  categoryId: z.string().optional(),
  testName: z.string().min(2, 'Test name is required'),
  testCode: z.string().min(2, 'Test code is required'),
  price: z.number().min(0, 'Price must be positive'),
  discount: z.number().min(0).max(100).optional(),
  priority: z.enum(['NORMAL', 'URGENT', 'CRITICAL']).optional(),
  scheduledAt: z.string().optional(),
  notes: z.string().optional(),
});

// Support ticket schemas
export const createTicketSchema = z.object({
  subject: z.string().min(5, 'Subject must be at least 5 characters'),
  description: z.string().min(20, 'Description must be at least 20 characters'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  category: z.string().optional(),
});

// Payment schemas
export const createOrderSchema = z.object({
  planId: z.string().min(1, 'Plan is required'),
  billingCycle: z.enum(['MONTHLY', 'QUARTERLY', 'YEARLY']),
});

export const verifyPaymentSchema = z.object({
  orderId: z.string().min(1),
  paymentId: z.string().min(1),
  signature: z.string().min(1),
});