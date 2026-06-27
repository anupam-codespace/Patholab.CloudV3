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
      // ✅ Fetch custom test rates AND net prices
      customTestCommissions: {
        include: {
          testTemplate: { select: { name: true } }
        }
      },
      // Fetch all commissions and the related test/patient info for the ledger
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

  // ✅ Dynamically calculate the total lifetime commission and format custom rates
  return agencies.map(agency => ({
    ...agency,
    // Expose the new Tier and Volume fields to the frontend
    agencyTier: agency.agencyTier || "STANDARD",
    monthlyVolume: agency.monthlyVolume || 0,
    totalCommission: agency.commissions.reduce((sum, c) => sum + Number(c.amount), 0),
    // Map the custom commissions (including netPrice) to exactly match what the UI expects
    customTestCommissions: agency.customTestCommissions.map(cc => ({
      testTemplateId: cc.testTemplateId,
      testName: cc.testTemplate.name,
      commissionRate: cc.commissionRate,
      commissionType: cc.commissionType,
      netPrice: cc.netPrice ? Number(cc.netPrice) : null, // Include the fixed B2B rate
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
    netPrice?: number | null; // Allow passing fixed B2B rates
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
      // ✅ Insert custom commissions, mapping both commissionRate and netPrice safely
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
    netPrice?: number | null; // Allow passing fixed B2B rates
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
      // ✅ Delete old custom rates and insert the newly updated list containing netPrice/commission adjustments
      customTestCommissions: {
        deleteMany: {}, // Clear old ones
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