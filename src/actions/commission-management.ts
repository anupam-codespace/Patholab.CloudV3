'use server';

import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

// --- TYPES ---
type CommissionStatus = 'PENDING' | 'PAID' | 'CANCELLED';

interface Commission {
  id: string;
  amount: number;
  status: CommissionStatus;
  createdAt: Date;
  paidAt?: Date | null;
  transactionRef?: string | null;
  test: {
    testName: string;
    testNumber: string;
    finalPrice: number;
    patient?: {
      name: string;
    } | null;
  };
}

interface ProcessedEntity {
  id: string;
  name: string;
  contact: string | null;
  type: 'AGENCY' | 'DOCTOR';
  commissionRule: string;
  totalPending: number;
  totalPaid: number;
  pendingCount: number;
  recentCommissions: Commission[];
}

/**
 * Utility to verify authentication and retrieve the Lab ID.
 */
async function getLabId(): Promise<string> {
  const user = await getCurrentUser();
  if (!user?.labId) {
    throw new Error("Unauthorized: No Lab ID associated with this session.");
  }
  return user.labId;
}

/**
 * Fetches and processes all commission data for the dashboard.
 * Accepts optional date parameters to filter the results.
 */
export async function getCommissionDashboardData(fromDate?: string, toDate?: string) {
  try {
    const labId = await getLabId();

    // Dynamically build the date filter if both dates are provided
    let commissionFilter: any = {};
    if (fromDate && toDate) {
      commissionFilter.createdAt = {
        gte: new Date(fromDate),
        lte: new Date(new Date(toDate).setHours(23, 59, 59, 999)) // Sets time to end of the selected day
      };
    }

    // 1. Fetch Doctor Commissions
    const doctors = await prisma.doctor.findMany({
      where: { labId },
      include: {
        commissions: {
          where: commissionFilter, // <-- Applied date filter here
          include: { 
            test: { 
              select: { 
                testName: true, 
                testNumber: true, 
                finalPrice: true, 
                patient: { select: { name: true } } 
              } 
            } 
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    // 2. Fetch Agency Commissions
    const agencies = await prisma.agency.findMany({
      where: { labId },
      include: {
        commissions: {
          where: commissionFilter, // <-- Applied date filter here
          include: { 
            test: { 
              select: { 
                testName: true, 
                testNumber: true, 
                finalPrice: true, 
                patient: { select: { name: true } } 
              } 
            } 
          }
        }
      },
      orderBy: { agencyName: 'asc' }
    });

    // 3. Data Processing Engine
    const processStats = (entities: any[], isAgency: boolean): ProcessedEntity[] => {
      return entities.map(entity => {
        let totalPending = 0;
        let totalPaid = 0;
        let pendingCount = 0;

        entity.commissions.forEach((comm: Commission) => {
          if (comm.status === 'PENDING') {
            totalPending += comm.amount;
            pendingCount++;
          } else if (comm.status === 'PAID') {
            totalPaid += comm.amount;
          }
        });

        // Safely sort dates by converting to time representation
        const sortedCommissions = [...entity.commissions].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        return {
          id: entity.id,
          name: isAgency ? entity.agencyName : entity.name,
          contact: isAgency ? entity.contactPerson : (entity.phone || null),
          type: isAgency ? 'AGENCY' : 'DOCTOR',
          commissionRule: `${entity.commissionRate}${entity.commissionType === 'PERCENTAGE' ? '%' : ' Flat'}`,
          totalPending,
          totalPaid,
          pendingCount,
          recentCommissions: sortedCommissions.slice(0, 10)
        };
      });
    };

    return {
      doctors: processStats(doctors, false),
      agencies: processStats(agencies, true)
    };

  } catch (error) {
    console.error("[getCommissionDashboardData] Error:", error);
    throw new Error("Failed to load commission data. Please try again.");
  }
}

/**
 * Settles an array of commissions, marking them as PAID.
 */
export async function markCommissionAsPaid(commissionIds: string[], transactionRef: string) {
  try {
    // 1. Verify Auth
    await getLabId(); 

    if (!commissionIds || commissionIds.length === 0) {
      throw new Error("No commissions selected for settlement.");
    }

    // 2. Execute Batch Update
    await prisma.commission.updateMany({
      where: { 
        id: { in: commissionIds },
        status: 'PENDING' // Safety check: only update pending commissions
      },
      data: {
        status: 'PAID',
        paidAt: new Date(),
        transactionRef: transactionRef.trim()
      }
    });

    // 3. Purge Next.js Router Cache
    revalidatePath('/lab-owner/commissions');
    
    return { success: true };

  } catch (error) {
    console.error("[markCommissionAsPaid] Error:", error);
    throw new Error("Failed to process commission settlement.");
  }
}