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

  // ✅ NEW: Aggregate stats — total commission, monthly breakdown, top referrers, ratio
  const allCommissions = await prisma.commission.findMany({
    where: {
      test: { labId }
    },
    select: {
      id: true,
      amount: true,
      status: true,
      createdAt: true,
      doctorId: true,
      agencyId: true,
      doctor: { select: { id: true, name: true } },
      agency: { select: { id: true, agencyName: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  let totalAllTime = 0;
  let totalPendingAmount = 0;
  let totalPaidAmount = 0;
  const referrerMap: Record<string, { id: string; name: string; type: 'DOCTOR' | 'AGENCY'; amount: number; count: number }> = {};

  // Build monthly breakdown for last 6 months
  const now = new Date();
  const monthlyBuckets: Array<{ key: string; label: string; total: number; pending: number; paid: number }> = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleString('en-IN', { month: 'short', year: 'numeric' });
    monthlyBuckets.push({ key, label, total: 0, pending: 0, paid: 0 });
  }

  allCommissions.forEach((c) => {
    const amt = Number(c.amount);
    totalAllTime += amt;
    if (c.status === 'PENDING') totalPendingAmount += amt;
    if (c.status === 'PAID') totalPaidAmount += amt;

    // Monthly bucket
    const cd = new Date(c.createdAt);
    const key = `${cd.getFullYear()}-${String(cd.getMonth() + 1).padStart(2, '0')}`;
    const bucket = monthlyBuckets.find(b => b.key === key);
    if (bucket) {
      bucket.total += amt;
      if (c.status === 'PENDING') bucket.pending += amt;
      if (c.status === 'PAID') bucket.paid += amt;
    }

    // Top referrer aggregation
    if (c.doctorId && c.doctor) {
      const k = `DOCTOR:${c.doctorId}`;
      if (!referrerMap[k]) {
        referrerMap[k] = { id: c.doctorId, name: c.doctor.name, type: 'DOCTOR', amount: 0, count: 0 };
      }
      referrerMap[k].amount += amt;
      referrerMap[k].count += 1;
    } else if (c.agencyId && c.agency) {
      const k = `AGENCY:${c.agencyId}`;
      if (!referrerMap[k]) {
        referrerMap[k] = { id: c.agencyId, name: c.agency.agencyName, type: 'AGENCY', amount: 0, count: 0 };
      }
      referrerMap[k].amount += amt;
      referrerMap[k].count += 1;
    }
  });

  const topReferrers = Object.values(referrerMap)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5)
    .map(r => ({ ...r, amount: Number(r.amount.toFixed(2)) }));

  const pendingVsPaidRatio =
    totalPendingAmount + totalPaidAmount > 0
      ? Number(
          (
            (totalPaidAmount / (totalPendingAmount + totalPaidAmount)) *
            100
          ).toFixed(2),
        )
      : 0;

  return {
    doctors: processStats(doctors, false),
    agencies: processStats(agencies, true),
    // ✅ New aggregate stats — all amounts as native Numbers
    stats: {
      totalAllTime: Number(totalAllTime.toFixed(2)),
      totalPending: Number(totalPendingAmount.toFixed(2)),
      totalPaid: Number(totalPaidAmount.toFixed(2)),
      pendingVsPaidRatio, // percentage paid (0-100)
      monthlyBreakdown: monthlyBuckets.map(b => ({
        key: b.key,
        label: b.label,
        total: Number(b.total.toFixed(2)),
        pending: Number(b.pending.toFixed(2)),
        paid: Number(b.paid.toFixed(2)),
      })),
      topReferrers,
      totalCount: allCommissions.length,
    },
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
