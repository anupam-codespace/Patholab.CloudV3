'use server';

import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

// 1. GET FULL PATIENT DETAILS (Deep Fetch)
export async function getPatientFullDetails(patientId: string) {
  const user = await getCurrentUser();
  if (!user?.labId) throw new Error("Unauthorized");

  const patient = await prisma.patient.findFirst({
    where: { 
      id: patientId,
      labId: user.labId 
    },
    include: {
      // Fetch Test History
      tests: {
        orderBy: { createdAt: 'desc' },
        include: {
          doctor: { include: { user: true } },
          results: true, // To check result status
        }
      },
      // Fetch Billing History
      invoices: {
        orderBy: { createdAt: 'desc' },
        include: { items: true }
      },
      // Fetch Samples
      samples: {
        orderBy: { createdAt: 'desc' }
      }
    }
  });

  return patient;
}

// 2. UPDATE PATIENT DETAILS
export async function updatePatientDetails(patientId: string, data: any) {
  const user = await getCurrentUser();
  if (!user?.labId) throw new Error("Unauthorized");

  await prisma.patient.update({
    where: { id: patientId, labId: user.labId },
    data: {
      // Note: Name and Phone are intentionally excluded to prevent edits
      age: Number(data.age),
      ageUnit: data.ageUnit,
      gender: data.gender,
      email: data.email,
      address: data.address,
      bloodGroup: data.bloodGroup,
      medicalHistory: data.medicalHistory, // Stores JSON
      srfId: data.srfId,
      passportNumber: data.passportNumber,
      gstNumber: data.gstNumber
    }
  });

  revalidatePath('/workspace/patients');
  revalidatePath(`/workspace/patients/${patientId}`);
}