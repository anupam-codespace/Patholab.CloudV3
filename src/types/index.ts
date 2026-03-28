// FILE: src/types/index.ts
// TypeScript type definitions
// ==========================================

export interface User {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: Role;
  emailVerified: boolean;
  isActive: boolean;
  avatar: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type Role = 'SUPER_ADMIN' | 'LAB_OWNER' | 'TECHNICIAN' | 'RECEPTIONIST';

export interface Lab {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  email: string;
  licenseNumber: string;
  registrationNo: string | null;
  taxId: string | null;
  logo: string | null;
  isActive: boolean;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Plan {
  id: string;
  name: string;
  displayName: string;
  description: string;
  price: number;
  billingCycle: BillingCycle;
  features: string[];
  maxTests: number;
  maxStaff: number;
  maxPatients: number;
  storageGB: number;
  hasAnalytics: boolean;
  hasApiAccess: boolean;
  hasWhiteLabel: boolean;
  priority: number;
  isActive: boolean;
  isPopular: boolean;
}

export type BillingCycle = 'MONTHLY' | 'QUARTERLY' | 'YEARLY';

export interface Subscription {
  id: string;
  labId: string;
  planId: string;
  status: SubscriptionStatus;
  startDate: Date;
  endDate: Date;
  trialEndsAt: Date | null;
  autoRenew: boolean;
  cancelledAt: Date | null;
  razorpaySubscriptionId: string | null;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  plan?: Plan;
}

export type SubscriptionStatus = 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'CANCELLED' | 'EXPIRED';

export interface Payment {
  id: string;
  subscriptionId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  razorpayOrderId: string | null;
  razorpayPaymentId: string | null;
  razorpaySignature: string | null;
  paymentMethod: string | null;
  failureReason: string | null;
  invoiceId: string | null;
  paidAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type PaymentStatus = 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';

export interface Patient {
  id: string;
  labId: string;
  patientId: string;
  name: string;
  email: string | null;
  phone: string;
  dateOfBirth: Date | null;
  age: number | null;
  gender: Gender | null;
  bloodGroup: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  emergencyContact: string | null;
  emergencyPhone: string | null;
  medicalHistory: any;
  allergies: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type Gender = 'MALE' | 'FEMALE' | 'OTHER';

export interface Test {
  id: string;
  labId: string;
  testNumber: string;
  patientId: string;
  categoryId: string | null;
  testName: string;
  testCode: string;
  status: TestStatus;
  priority: TestPriority;
  scheduledAt: Date | null;
  sampleCollectedAt: Date | null;
  sampleCollectedBy: string | null;
  processingStartedAt: Date | null;
  processingBy: string | null;
  completedAt: Date | null;
  approvedAt: Date | null;
  approvedBy: string | null;
  results: any;
  reportUrl: string | null;
  reportGeneratedAt: Date | null;
  notes: string | null;
  instructions: string | null;
  price: number;
  discount: number;
  finalPrice: number;
  createdAt: Date;
  updatedAt: Date;
  patient?: Patient;
}

export type TestStatus = 
  | 'PENDING'
  | 'SCHEDULED'
  | 'SAMPLE_COLLECTED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'APPROVED'
  | 'DELIVERED'
  | 'CANCELLED';

export type TestPriority = 'NORMAL' | 'URGENT' | 'CRITICAL';

export interface SupportTicket {
  id: string;
  ticketNumber: string;
  userId: string;
  subject: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: string | null;
  assignedTo: string | null;
  resolvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  user?: User;
}

export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'WAITING_FOR_CUSTOMER' | 'RESOLVED' | 'CLOSED';
export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  data: any;
  isRead: boolean;
  readAt: Date | null;
  createdAt: Date;
}

export type NotificationType = 
  | 'SUBSCRIPTION'
  | 'PAYMENT'
  | 'TEST'
  | 'APPOINTMENT'
  | 'SYSTEM'
  | 'SUPPORT'
  | 'STAFF';

export interface DashboardStats {
  totalTests: number;
  pendingTests: number;
  completedTests: number;
  totalPatients: number;
  activePatients: number;
  totalRevenue: number;
  monthlyRevenue: number;
}

export interface ChartData {
  name: string;
  value: number;
  [key: string]: any;
}