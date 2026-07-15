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
  return doctors.map(doc => ({
    ...doc,
    // Convert Prisma Decimal to Number
    commissionRate: Number(doc.commissionRate || 0),
    totalReferrals: Number(doc.totalReferrals || 0),
    totalCommission: Number(doc.totalCommission || 0),
    // Calculate lifetime commission from commission records (all converted to Number)
    lifetimeCommission: doc.commissions.reduce((sum, c) => sum + Number(c.amount || 0), 0),
    // Map commissions with Number conversion
    commissions: doc.commissions.map(c => ({
      ...c,
      amount: Number(c.amount || 0),
      rate: Number(c.rate || 0),
    })),
    // Map custom commissions with Number conversion
    customTestCommissions: doc.customTestCommissions.map(cc => ({
      testTemplateId: cc.testTemplateId,
      testName: cc.testTemplate.name,
      commissionRate: Number(cc.commissionRate || 0),
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
      customTestCommissions: {
        create: data.customCommissions?.map(c => ({
          testTemplateId: c.testTemplateId,
          commissionRate: Number(c.commissionRate),
          commissionType: c.commissionType
        })) || []
      }
    }
  });

  revalidatePath('/workspace/doctors');
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
      customTestCommissions: {
        deleteMany: {},
        create: data.customCommissions?.map(c => ({
          testTemplateId: c.testTemplateId,
          commissionRate: Number(c.commissionRate),
          commissionType: c.commissionType
        })) || []
      }
    }
  });

  revalidatePath('/workspace/doctors');
}

export async function deleteDoctor(id: string) {
  const labId = await getLabId();
  await prisma.doctor.delete({
    where: { id, labId }
  });
  revalidatePath('/workspace/doctors');
}
