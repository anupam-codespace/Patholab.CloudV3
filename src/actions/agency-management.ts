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
      // ✅ NEW: Fetch the custom test rates so the frontend can populate the Edit modal
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
    totalCommission: agency.commissions.reduce((sum, c) => sum + c.amount, 0),
    // Map the custom commissions to exactly match what the frontend UI expects
    customTestCommissions: agency.customTestCommissions.map(cc => ({
      testTemplateId: cc.testTemplateId,
      testName: cc.testTemplate.name,
      commissionRate: cc.commissionRate,
      commissionType: cc.commissionType
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
    commissionRate: number;
    commissionType: CommissionType;
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
      // ✅ NEW: Insert the custom test rates along with the agency creation
      customTestCommissions: {
        create: data.customCommissions?.map(c => ({
          testTemplateId: c.testTemplateId,
          commissionRate: Number(c.commissionRate),
          commissionType: c.commissionType
        })) || []
      }
    }
  });
  
  revalidatePath('/lab-owner/agencies');
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
    commissionRate: number;
    commissionType: CommissionType;
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
      // ✅ NEW: Delete any existing custom rates for this agency and insert the newly updated list
      customTestCommissions: {
        deleteMany: {}, // Clear old ones
        create: data.customCommissions?.map(c => ({
          testTemplateId: c.testTemplateId,
          commissionRate: Number(c.commissionRate),
          commissionType: c.commissionType
        })) || []
      }
    }
  });
  
  revalidatePath('/lab-owner/agencies');
}

export async function deleteAgency(id: string) {
  const labId = await getLabId();
  await prisma.agency.delete({
    where: { id, labId }
  });
  revalidatePath('/lab-owner/agencies');
}