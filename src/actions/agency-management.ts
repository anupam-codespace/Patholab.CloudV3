'use server';

import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { CommissionType } from '@prisma/client';

async function getLabId() {
  const user = await getCurrentUser();
  if (!user?.labId) throw new Error("Unauthorized");
  return user.labId;
}

export async function getAgencies() {
  const labId = await getLabId();

  const agencies = await prisma.agency.findMany({
    where: { labId },
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: { tests: true, patients: true }
      },
      customTestCommissions: {
        include: {
          testTemplate: { select: { name: true } }
        }
      },
      commissions: {
        include: {
          test: {
            select: {
              testName: true,
              testNumber: true,
              createdAt: true,
              patient: { select: { name: true } }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }
    }
  });

  // ✅ Convert ALL Decimal fields to Number for client-side use
  return agencies.map(agency => ({
    ...agency,
    // Convert Prisma Decimal to Number
    commissionRate: Number(agency.commissionRate || 0),
    totalReferrals: Number(agency.totalReferrals || 0),
    totalCommission: Number(agency.totalCommission || 0),
    // Calculate lifetime commission from commission records
    lifetimeCommission: agency.commissions.reduce((sum, c) => sum + Number(c.amount || 0), 0),
    agencyTier: agency.agencyTier || "STANDARD",
    monthlyVolume: Number(agency.monthlyVolume || 0),
    // Map commissions with Number conversion
    commissions: agency.commissions.map(c => ({
      ...c,
      amount: Number(c.amount || 0),
      rate: Number(c.rate || 0),
    })),
    // Map custom commissions with Number conversion
    customTestCommissions: agency.customTestCommissions.map(cc => ({
      testTemplateId: cc.testTemplateId,
      testName: cc.testTemplate.name,
      commissionRate: cc.commissionRate ? Number(cc.commissionRate) : null,
      commissionType: cc.commissionType,
      netPrice: cc.netPrice ? Number(cc.netPrice) : null,
    }))
  }));
}

export async function createAgency(data: {
  agencyName: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  panNumber?: string;
  commissionRate?: number;
  commissionType: CommissionType;
  customCommissions?: {
    testTemplateId: string;
    commissionRate?: number | null;
    commissionType: CommissionType;
    netPrice?: number | null;
  }[];
}) {
  const labId = await getLabId();

  await prisma.agency.create({
    data: {
      agencyName: data.agencyName,
      contactPerson: data.contactPerson,
      phone: data.phone,
      email: data.email,
      panNumber: data.panNumber,
      commissionRate: data.commissionRate,
      commissionType: data.commissionType,
      labId,
      customTestCommissions: {
        create: data.customCommissions?.map(c => ({
          testTemplateId: c.testTemplateId,
          commissionRate: c.commissionRate ? Number(c.commissionRate) : null,
          commissionType: c.commissionType,
          netPrice: c.netPrice ? Number(c.netPrice) : null,
        })) || []
      }
    }
  });

  revalidatePath('/workspace/agencies');
}

export async function updateAgency(id: string, data: {
  agencyName: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  panNumber?: string;
  commissionRate?: number;
  commissionType: CommissionType;
  customCommissions?: {
    testTemplateId: string;
    commissionRate?: number | null;
    commissionType: CommissionType;
    netPrice?: number | null;
  }[];
}) {
  const labId = await getLabId();

  await prisma.agency.update({
    where: { id, labId },
    data: {
      agencyName: data.agencyName,
      contactPerson: data.contactPerson,
      phone: data.phone,
      email: data.email,
      panNumber: data.panNumber,
      commissionRate: data.commissionRate,
      commissionType: data.commissionType,
      customTestCommissions: {
        deleteMany: {},
        create: data.customCommissions?.map(c => ({
          testTemplateId: c.testTemplateId,
          commissionRate: c.commissionRate ? Number(c.commissionRate) : null,
          commissionType: c.commissionType,
          netPrice: c.netPrice ? Number(c.netPrice) : null,
        })) || []
      }
    }
  });

  revalidatePath('/workspace/agencies');
}

export async function deleteAgency(id: string) {
  const labId = await getLabId();
  await prisma.agency.delete({
    where: { id, labId }
  });
  revalidatePath('/workspace/agencies');
}
