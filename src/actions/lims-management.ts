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
    where: { 
      OR: [
        { labId: labId },
        { isGlobal: true }
      ]
    },
    orderBy: [
      { isGlobal: 'desc' }, 
      { displayOrder: 'asc' }, 
      { name: 'asc' }
    ],
    // ✅ FIXED: Changed 'templates' to 'TestTemplate' to exactly match the Prisma auto-generated relation name
    include: { _count: { select: { TestTemplate: true } } }
  });
}

export async function createDepartment(data: { name: string; code?: string; displayOrder?: number }) {
  const labId = await getLabId();
  await prisma.department.create({ 
    data: { 
      ...data, 
      labId,
      isGlobal: false 
    } 
  });
  revalidatePath('/workspace/test-management');
}

export async function updateDepartment(id: string, data: { name: string; code?: string; displayOrder?: number }) {
    const labId = await getLabId();
    // Security check to ensure they own the department
    const existing = await prisma.department.findUnique({ where: { id } });
    if (!existing || existing.labId !== labId || existing.isGlobal) {
      throw new Error("Unauthorized or Cannot edit global master");
    }

    await prisma.department.update({
        where: { id },
        data
    });
    revalidatePath('/workspace/test-management');
}

export async function deleteDepartment(id: string) {
  const labId = await getLabId();
  const existing = await prisma.department.findUnique({ where: { id } });
  if (!existing || existing.labId !== labId || existing.isGlobal) {
    throw new Error("Unauthorized or Cannot delete global master");
  }

  await prisma.department.delete({ where: { id } });
  revalidatePath('/workspace/test-management');
}

// ==========================================
// 2. SAMPLE TYPE ACTIONS
// ==========================================

export async function getSampleTypes() {
  const labId = await getLabId();
  return await prisma.sampleType.findMany({
    where: { 
      OR: [
        { labId: labId },
        { isGlobal: true }
      ]
    },
    orderBy: { name: 'asc' }
  });
}

export async function createSampleType(data: { name: string; code?: string }) {
  const labId = await getLabId();
  await prisma.sampleType.create({ 
    data: { ...data, labId, isGlobal: false } 
  });
  revalidatePath('/workspace/test-management');
}

export async function updateSampleType(id: string, data: { name: string; code?: string }) {
    const labId = await getLabId();
    const existing = await prisma.sampleType.findUnique({ where: { id } });
    if (!existing || existing.labId !== labId || existing.isGlobal) {
      throw new Error("Unauthorized or Cannot edit global master");
    }

    await prisma.sampleType.update({
        where: { id },
        data
    });
    revalidatePath('/workspace/test-management');
}

export async function deleteSampleType(id: string) {
  const labId = await getLabId();
  const existing = await prisma.sampleType.findUnique({ where: { id } });
  if (!existing || existing.labId !== labId || existing.isGlobal) {
    throw new Error("Unauthorized or Cannot delete global master");
  }

  await prisma.sampleType.delete({ where: { id } });
  revalidatePath('/workspace/test-management');
}

// ==========================================
// 3. TEST HEADING ACTIONS
// ==========================================

export async function getTestHeadings() {
  const labId = await getLabId();
  return await prisma.testHeading.findMany({
    where: { 
      OR: [
        { labId: labId },
        { isGlobal: true }
      ]
    },
    orderBy: { name: 'asc' }
  });
}

export async function createTestHeading(name: string) {
  const labId = await getLabId();
  await prisma.testHeading.create({ 
    data: { name, labId, isGlobal: false } 
  });
  revalidatePath('/workspace/test-management');
}

export async function updateTestHeading(id: string, name: string) {
    const labId = await getLabId();
    const existing = await prisma.testHeading.findUnique({ where: { id } });
    if (!existing || existing.labId !== labId || existing.isGlobal) {
      throw new Error("Unauthorized or Cannot edit global master");
    }

    await prisma.testHeading.update({
        where: { id },
        data: { name }
    });
    revalidatePath('/workspace/test-management');
}

export async function deleteTestHeading(id: string) {
    const labId = await getLabId();
    const existing = await prisma.testHeading.findUnique({ where: { id } });
    if (!existing || existing.labId !== labId || existing.isGlobal) {
      throw new Error("Unauthorized or Cannot delete global master");
    }

    await prisma.testHeading.delete({ where: { id } });
    revalidatePath('/workspace/test-management');
}

// ==========================================
// 4. CONTAINER / TUBE ACTIONS
// ==========================================

export async function getContainerTypes() {
  const labId = await getLabId();
  return await prisma.containerType.findMany({
    where: { 
      OR: [
        { labId: labId },
        { isGlobal: true }
      ]
    },
    orderBy: { name: 'asc' }
  });
}

// ✅ Added Missing Create Container Type
export async function createContainerType(data: { name: string; code: string; capColor?: string }) {
  const labId = await getLabId();
  await prisma.containerType.create({ 
    data: { ...data, labId, isGlobal: false } 
  });
  revalidatePath('/workspace/test-management');
}

// ✅ Added Missing Update Container Type
export async function updateContainerType(id: string, data: { name: string; code: string; capColor?: string }) {
  const labId = await getLabId();
  const existing = await prisma.containerType.findUnique({ where: { id } });
  
  if (!existing || existing.labId !== labId || existing.isGlobal) {
    throw new Error("Unauthorized or Cannot edit global master");
  }

  await prisma.containerType.update({
      where: { id },
      data
  });
  revalidatePath('/workspace/test-management');
}

// ✅ Added Missing Delete Container Type
export async function deleteContainerType(id: string) {
  const labId = await getLabId();
  const existing = await prisma.containerType.findUnique({ where: { id } });
  
  if (!existing || existing.labId !== labId || existing.isGlobal) {
    throw new Error("Unauthorized or Cannot delete global master");
  }

  await prisma.containerType.delete({ where: { id } });
  revalidatePath('/workspace/test-management');
}