'use server';

import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

async function getLabId() {
  const user = await getCurrentUser();
  if (!user?.labId) throw new Error("Unauthorized");
  return user.labId;
}

// --- 1. GET ALL CONTAINERS ---
export async function getContainerTypes() {
  const labId = await getLabId();
  return await prisma.containerType.findMany({
    where: { labId },
    orderBy: { name: 'asc' }
  });
}

// --- 2. CREATE CONTAINER ---
export async function createContainerType(data: {
  name: string;
  code: string;
  capColor: string;
}) {
  const labId = await getLabId();

  try {
    await prisma.containerType.create({
      data: {
        labId,
        name: data.name,
        code: data.code.toUpperCase(),
        capColor: data.capColor,
      }
    });
    revalidatePath('/workspace/test-management');
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false, error: "Failed to create container" };
  }
}

// --- 3. UPDATE CONTAINER ---
export async function updateContainerType(id: string, data: {
  name: string;
  code: string;
  capColor: string;
}) {
  const labId = await getLabId();

  try {
    await prisma.containerType.update({
      where: { id, labId },
      data: {
        name: data.name,
        code: data.code.toUpperCase(),
        capColor: data.capColor,
      }
    });
    revalidatePath('/workspace/test-management');
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to update container" };
  }
}

// --- 4. DELETE CONTAINER ---
export async function deleteContainerType(id: string) {
  const labId = await getLabId();
  try {
    await prisma.containerType.delete({
      where: { id, labId }
    });
    revalidatePath('/workspace/test-management');
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to delete container" };
  }
}