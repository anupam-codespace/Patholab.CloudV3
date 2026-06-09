import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';

// Granular permissions for LabStaff
export type AppPermission = 
  | 'inventory:view' 
  | 'inventory:create' 
  | 'inventory:edit' 
  | 'inventory:delete'
  | 'reports:view'
  | 'reports:sign'
  | 'finance:view'
  | 'settings:manage'
  | 'patient:create'; // Add specific billable actions

interface GuardOptions {
  userId: string;
  labId?: string | null; // Allow null to support new owners in onboarding
  branchId?: string | null; 
  requiredPermission?: AppPermission;
  isApiRoute?: boolean; 
}

export async function authorizeAccess({
  userId,
  labId,
  branchId,
  requiredPermission,
  isApiRoute = false,
}: GuardOptions) {
  
  // 1. Fetch User with direct Lab (for Owners) OR Staff Profile (for Employees)
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      lab: { include: { wallet: true } }, 
      staffLabs: {
        where: labId ? { labId } : { isActive: true },
        include: { lab: { include: { wallet: true } } }
      }
    }
  });

  if (!user) {
    if (isApiRoute) return { authorized: false, error: 'User not found', status: 401 };
    redirect('/login');
  }

  const isOwner = user.role === 'LAB_OWNER';
  const isSuperAdmin = user.role === 'SUPER_ADMIN';
  const isGodMode = isOwner || isSuperAdmin;

  // 2. Resolve Active Lab & Context Safely
  let activeLab = null;
  let staffProfile = null;

  if (isOwner) {
    activeLab = user.lab;
  } else if (!isSuperAdmin) {
    staffProfile = user.staffLabs[0];
    activeLab = staffProfile?.lab;
  }

  // Handle Onboarding State (Owner with no lab yet MUST be allowed to pass to see the setup modal)
  if (!activeLab && isOwner && !labId) {
    return { authorized: true, user, isGodMode }; 
  }

  // Handle Missing Staff Connection
  if (!isGodMode && (!staffProfile || (labId && staffProfile.labId !== labId))) {
    if (isApiRoute) return { authorized: false, error: 'Unauthorized for this Lab', status: 403 };
    redirect('/unauthorized');
  }

  const wallet = activeLab?.wallet;

  // ==========================================
  // TIER 1: WALLET HEALTH CHECK (PAY-AS-YOU-GO)
  // ==========================================
  // We do NOT block read access if the wallet is empty. We only block specific paid actions.
  if (wallet) {
    const isWalletExpired = wallet.validityEndDate && wallet.validityEndDate < new Date();
    const isBalanceEmpty = Number(wallet.balance) <= 0;

    // Define which granular permissions trigger a hard block when funds are empty
    const paidActions = ['patient:create']; 

    if ((isWalletExpired || isBalanceEmpty) && requiredPermission && paidActions.includes(requiredPermission)) {
        if (isApiRoute) return { authorized: false, error: 'Wallet empty or expired. Please recharge.', status: 402 };
        redirect('/workspace/wallet'); 
    }
  }

  // ==========================================
  // TIER 2: RBAC & GRANULAR PERMISSIONS
  // ==========================================
  if (!isGodMode && requiredPermission && staffProfile) {
    const hasPermission = staffProfile.permissions.includes(requiredPermission);

    if (!hasPermission) {
      if (isApiRoute) return { authorized: false, error: 'Insufficient staff permissions', status: 403 };
      redirect('/unauthorized');
    }
  }

  // ==========================================
  // TIER 3: BRANCH ISOLATION
  // ==========================================
  if (branchId && !isGodMode && staffProfile) {
    if (staffProfile.branchId && staffProfile.branchId !== branchId) {
      if (isApiRoute) return { authorized: false, error: 'Cross-branch access denied', status: 403 };
      redirect('/unauthorized');
    }
  }

  return { 
    authorized: true, 
    user,
    staffProfile, 
    wallet,
    activeLab
  };
}