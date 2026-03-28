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

export async function getDoctors() {
  const labId = await getLabId();
  
  const doctors = await prisma.doctor.findMany({
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
  return doctors.map(doc => ({
    ...doc,
    totalCommission: doc.commissions.reduce((sum, c) => sum + c.amount, 0),
    // Map the custom commissions to exactly match what the frontend UI expects
    customTestCommissions: doc.customTestCommissions.map(cc => ({
      testTemplateId: cc.testTemplateId,
      testName: cc.testTemplate.name,
      commissionRate: cc.commissionRate,
      commissionType: cc.commissionType
    }))
  }));
}

export async function createDoctor(data: {
  name: string;
  phone?: string;
  email?: string;
  specialization?: string;
  clinic?: string;
  commissionRate?: number;
  commissionType: CommissionType;
  customCommissions?: {
    testTemplateId: string;
    commissionRate: number;
    commissionType: CommissionType;
  }[];
}) {
  const labId = await getLabId();
  
  await prisma.doctor.create({
    data: {
      name: data.name,
      phone: data.phone,
      email: data.email,
      specialization: data.specialization,
      clinic: data.clinic,
      commissionRate: data.commissionRate,
      commissionType: data.commissionType,
      labId,
      // ✅ NEW: Insert the custom test rates along with the doctor creation
      customTestCommissions: {
        create: data.customCommissions?.map(c => ({
          testTemplateId: c.testTemplateId,
          commissionRate: Number(c.commissionRate),
          commissionType: c.commissionType
        })) || []
      }
    }
  });
  
  revalidatePath('/lab-owner/doctors');
}

export async function updateDoctor(id: string, data: {
  name: string;
  phone?: string;
  email?: string;
  specialization?: string;
  clinic?: string;
  commissionRate?: number;
  commissionType: CommissionType;
  customCommissions?: {
    testTemplateId: string;
    commissionRate: number;
    commissionType: CommissionType;
  }[];
}) {
  const labId = await getLabId();
  
  await prisma.doctor.update({
    where: { id, labId },
    data: {
      name: data.name,
      phone: data.phone,
      email: data.email,
      specialization: data.specialization,
      clinic: data.clinic,
      commissionRate: data.commissionRate,
      commissionType: data.commissionType,
      // ✅ NEW: Delete any existing custom rates for this doctor and insert the newly updated list
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
  
  revalidatePath('/lab-owner/doctors');
}

export async function deleteDoctor(id: string) {
  const labId = await getLabId();
  // No need to manually delete customTestCommissions because your schema has `onDelete: Cascade`
  await prisma.doctor.delete({
    where: { id, labId }
  });
  revalidatePath('/lab-owner/doctors');
}