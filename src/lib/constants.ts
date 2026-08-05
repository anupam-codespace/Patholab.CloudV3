// ==========================================
// FILE: src/lib/constants.ts
// Application constants
// ==========================================

export const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  LAB_OWNER: 'LAB_OWNER',
  TECHNICIAN: 'TECHNICIAN',
  RECEPTIONIST: 'RECEPTIONIST',
} as const;

export const SUBSCRIPTION_STATUS = {
  TRIAL: 'TRIAL',
  ACTIVE: 'ACTIVE',
  PAST_DUE: 'PAST_DUE',
  CANCELLED: 'CANCELLED',
  EXPIRED: 'EXPIRED',
} as const;

export const PAYMENT_STATUS = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  SUCCESS: 'SUCCESS',
  FAILED: 'FAILED',
  REFUNDED: 'REFUNDED',
} as const;

export const TEST_STATUS = {
  PENDING: 'PENDING',
  SCHEDULED: 'SCHEDULED',
  SAMPLE_COLLECTED: 'SAMPLE_COLLECTED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  APPROVED: 'APPROVED',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
} as const;

export const BILLING_CYCLES = [
  { value: 'MONTHLY', label: 'Monthly', months: 1 },
  { value: 'QUARTERLY', label: 'Quarterly', months: 3 },
  { value: 'YEARLY', label: 'Yearly', months: 12 },
];

export const TICKET_STATUS = {
  OPEN: 'OPEN',
  IN_PROGRESS: 'IN_PROGRESS',
  WAITING_FOR_CUSTOMER: 'WAITING_FOR_CUSTOMER',
  RESOLVED: 'RESOLVED',
  CLOSED: 'CLOSED',
} as const;

export const TICKET_PRIORITY = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  URGENT: 'URGENT',
} as const;

export const OTP_EXPIRY_MINUTES = 10;
export const TRIAL_PERIOD_DAYS = 14;
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export const DASHBOARD_ROUTES = {
  SUPER_ADMIN: '/admin',
  LAB_OWNER: '/workspace',
  TECHNICIAN: '/technician',
  RECEPTIONIST: '/receptionist',
};
