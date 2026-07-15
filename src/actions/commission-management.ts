'use server';

import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

async function getLabId() {
  const user = await getCurrentUser();
  if (!user?.labId) throw new Error("Unauthorized");
  return user.labId;
}

export async function getCommissionDashboardData() {
  const labId = await getLabId();

  // 1. Fetch Doctor Commissions
  const doctors = await prisma.doctor.findMany({
    where: { labId },
    include: {
      commissions: {
        include: { test: { select: { testName: true, testNumber: true, finalPrice: true, patient: { select: { name: true } } } } }
      }
    },
    orderBy: { name: 'asc' }
  });

  // 2. Fetch Agency Commissions
  const agencies = await prisma.agency.findMany({
    where: { labId },
    include: {
      commissions: {
        include: { test: { select: { testName: true, testNumber: true, finalPrice: true, patient: { select: { name: true } } } } }
      }
    },
    orderBy: { agencyName: 'asc' }
  });

  // 3. Process Data — Convert Prisma Decimal to Number for all amounts
  const processStats = (entities: any[], isAgency: boolean) => {
    return entities.map(entity => {
      let totalPending = 0;
      let totalPaid = 0;
      let pendingCount = 0;

      entity.commissions.forEach((comm: any) => {
        // ✅ Convert Prisma Decimal to Number
        const amount = Number(comm.amount);

        if (comm.status === 'PENDING') {
          totalPending += amount;
          pendingCount++;
        } else if (comm.status === 'PAID') {
          totalPaid += amount;
        }
      });

      // ✅ Convert all Decimal fields to Number in recentCommissions
      const recentCommissions = entity.commissions
        .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 10)
        .map((comm: any) => ({
          ...comm,
          amount: Number(comm.amount),
          rate: Number(comm.rate),
          test: comm.test ? {
            ...comm.test,
            finalPrice: Number(comm.test.finalPrice || 0),
          } : null,
        }));

      return {
        id: entity.id,
        name: isAgency ? entity.agencyName : entity.name,
        contact: isAgency ? entity.contactPerson : entity.phone,
        type: isAgency ? 'AGENCY' : 'DOCTOR',
        commissionRule: `${Number(entity.commissionRate || 0)} ${entity.commissionType === 'PERCENTAGE' ? '%' : 'Flat'}`,
        totalPending,
        totalPaid,
        pendingCount,
        totalReferrals: Number(entity.totalReferrals || 0),
        totalCommission: Number(entity.totalCommission || 0),
        recentCommissions,
      };
    });
  };

  return {
    doctors: processStats(doctors, false),
    agencies: processStats(agencies, true)
  };
}

export async function markCommissionAsPaid(commissionIds: string[], transactionRef: string) {
  await getLabId();

  await prisma.commission.updateMany({
    where: { id: { in: commissionIds } },
    data: {
      status: 'PAID',
      paidAt: new Date(),
      transactionRef: transactionRef
    }
  });

  revalidatePath('/workspace/commissions');
  return { success: true };
}
