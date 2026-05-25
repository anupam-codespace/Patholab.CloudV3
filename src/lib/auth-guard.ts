import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma'; // Adjust to your prisma client path

// ==========================================
// 1. STRICT TYPING
// ==========================================

// Map these to your Plan boolean flags and string features
export type SaasFeature = 
  | 'hasInventory' 
  | 'hasAnalytics' 
  | 'hasB2bBilling' 
  | 'hasLogistics' 
  | 'hasRadiology'
  | 'PREMIUM_SUPPORT'
  | 'CUSTOM_BRANDING';

// Granular permissions for LabStaff
export type AppPermission = 
  | 'inventory:view' 
  | 'inventory:create' 
  | 'inventory:edit' 
  | 'inventory:delete'
  | 'reports:view'
  | 'reports:sign'
  | 'finance:view'
  | 'settings:manage';

interface GuardOptions {
  userId: string;
  labId: string;
  branchId?: string | null; // Optional: To check if staff is locked to a specific branch
  requiredFeature?: SaasFeature;
  requiredPermission?: AppPermission;
  isApiRoute?: boolean; // Set to true if calling from route.ts so it doesn't redirect
}

// ==========================================
// 2. THE MASTER GUARD FUNCTION
// ==========================================

export async function authorizeAccess({
  userId,
  labId,
  branchId,
  requiredFeature,
  requiredPermission,
  isApiRoute = false,
}: GuardOptions) {
  
  // 1. Fetch Subscription and Staff Profile Concurrently for speed
  const [subscription, staff] = await Promise.all([
    prisma.subscription.findUnique({
      where: { labId },
      include: { plan: true },
    }),
    prisma.labStaff.findUnique({
      where: { labId_userId: { labId, userId } },
      include: { user: true },
    }),
  ]);

  // Handle Missing Core Data
  if (!staff || !staff.user) {
    if (isApiRoute) return { authorized: false, error: 'User not found in this Lab', status: 401 };
    redirect('/login');
  }

  // ==========================================
  // TIER 1: SAAS SUBSCRIPTION CHECK
  // ==========================================
  if (requiredFeature && subscription) {
    const { plan, unlockedFeatures } = subscription;
    
    // Check if the feature is a base Plan boolean (e.g., hasInventory: true)
    const hasBaseBooleanFeature = (plan as any)[requiredFeature] === true;
    
    // Check if it's in the Plan's string features array
    const hasPlanStringFeature = plan.features.includes(requiredFeature);
    
    // Check if it was manually unlocked for this specific subscription (Add-on/Override)
    const hasUnlockedOverride = unlockedFeatures.includes(requiredFeature);

    if (!hasBaseBooleanFeature && !hasPlanStringFeature && !hasUnlockedOverride) {
      if (isApiRoute) return { authorized: false, error: 'Module not included in current subscription plan', status: 403 };
      redirect('/upgrade');
    }
  }

  // ==========================================
  // TIER 2: RBAC & GRANULAR PERMISSIONS
  // ==========================================
  const userRole = staff.user.role;
  const isGodMode = userRole === 'SUPER_ADMIN' || userRole === 'LAB_OWNER';

  if (!isGodMode && requiredPermission) {
    // Because we used PostgreSQL String[], this is just a standard array includes check
    const hasPermission = staff.permissions.includes(requiredPermission);

    if (!hasPermission) {
      if (isApiRoute) return { authorized: false, error: 'Insufficient staff permissions', status: 403 };
      redirect('/dashboard/unauthorized');
    }
  }

  // ==========================================
  // TIER 3: BRANCH ISOLATION (Optional but Recommended)
  // ==========================================
  if (branchId && !isGodMode) {
    // If the staff has a specific branchId assigned, they cannot access data of another branchId
    if (staff.branchId && staff.branchId !== branchId) {
      if (isApiRoute) return { authorized: false, error: 'Cross-branch access denied', status: 403 };
      redirect('/dashboard/unauthorized');
    }
  }

  // Passed all checks!
  return { 
    authorized: true, 
    staff, 
    subscription 
  };
}