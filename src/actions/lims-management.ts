'use server';

import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

// --- HELPER: Get Lab ID ---
async function getLabId() {
  const user = await getCurrentUser();
  if (!user || !user.labId) throw new Error("Unauthorized");
  return user.labId;
}

// ==========================================
// 1. DEPARTMENT ACTIONS
// ==========================================

export async function getDepartments() {
  const labId = await getLabId();
  return await prisma.department.findMany({
    where: { labId },
    orderBy: { displayOrder: 'asc' },
    include: { _count: { select: { testTemplates: true } } }
  });
}

export async function createDepartment(data: { name: string; code?: string }) {
  const labId = await getLabId();
  await prisma.department.create({ data: { ...data, labId } });
  revalidatePath('/lab-owner/test-management');
}

export async function updateDepartment(id: string, data: { name: string }) {
    const labId = await getLabId();
    await prisma.department.update({
        where: { id, labId },
        data
    });
    revalidatePath('/lab-owner/test-management');
}

export async function deleteDepartment(id: string) {
  const labId = await getLabId();
  await prisma.department.delete({ where: { id, labId } });
  revalidatePath('/lab-owner/test-management');
}

// ==========================================
// 2. SAMPLE TYPE ACTIONS
// ==========================================

export async function getSampleTypes() {
  const labId = await getLabId();
  return await prisma.sampleType.findMany({
    where: { labId },
    orderBy: { name: 'asc' }
  });
}

export async function createSampleType(data: { name: string; code?: string }) {
  const labId = await getLabId();
  await prisma.sampleType.create({ data: { ...data, labId } });
  revalidatePath('/lab-owner/test-management');
}

export async function updateSampleType(id: string, data: { name: string }) {
    const labId = await getLabId();
    await prisma.sampleType.update({
        where: { id, labId },
        data
    });
    revalidatePath('/lab-owner/test-management');
}

export async function deleteSampleType(id: string) {
  const labId = await getLabId();
  await prisma.sampleType.delete({ where: { id, labId } });
  revalidatePath('/lab-owner/test-management');
}

// ==========================================
// 3. TEST HEADING ACTIONS
// ==========================================

export async function getTestHeadings() {
  const labId = await getLabId();
  return await prisma.testHeading.findMany({
    where: { labId },
    orderBy: { name: 'asc' }
  });
}

export async function createTestHeading(name: string) {
  const labId = await getLabId();
  await prisma.testHeading.create({ data: { name, labId } });
  revalidatePath('/lab-owner/test-management');
}

export async function updateTestHeading(id: string, name: string) {
    const labId = await getLabId();
    await prisma.testHeading.update({
        where: { id, labId },
        data: { name }
    });
    revalidatePath('/lab-owner/test-management');
}

export async function deleteTestHeading(id: string) {
    const labId = await getLabId();
    await prisma.testHeading.delete({ where: { id, labId } });
    revalidatePath('/lab-owner/test-management');
}

// ==========================================
// 4. CONTAINER / TUBE ACTIONS (✅ NEW ADDITION)
// ==========================================

export async function getContainerTypes() {
  const labId = await getLabId();
  return await prisma.containerType.findMany({
    where: { labId },
    orderBy: { name: 'asc' }
  });
}