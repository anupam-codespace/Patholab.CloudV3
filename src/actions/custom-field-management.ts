'use server';

import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { FieldType } from '@prisma/client';

// Helper to ensure authentication
async function getLabId() {
  const user = await getCurrentUser();
  if (!user?.labId) throw new Error("Unauthorized");
  return user.labId;
}

// --- 1. GET ALL DEFINITIONS ---
export async function getCustomFields() {
  const labId = await getLabId();
  try {
    return await prisma.customFieldDefinition.findMany({
      where: { labId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { usedInTests: true }
        }
      }
    });
  } catch (error) {
    console.error("Failed to fetch custom fields:", error);
    return [];
  }
}

// --- 2. CREATE OR UPDATE DEFINITION ---
export async function saveCustomField(data: {
  id?: string;
  name: string;
  type: FieldType; // 'TEXT' | 'LONG_TEXT' | 'DROPDOWN' | 'DATE' | 'IMAGE' | 'RICH_TEXT'
  options?: string[]; // For Dropdown
  printOnReport?: boolean;
  reportLayout?: string; // ✅ ADDED: 'FULL', 'HALF', 'THIRD'
}) {
  const labId = await getLabId();

  try {
    if (data.id) {
      // UPDATE Existing
      await prisma.customFieldDefinition.update({
        where: { id: data.id, labId },
        data: {
          name: data.name,
          type: data.type,
          options: data.options || [],
          printOnReport: data.printOnReport ?? true,
          reportLayout: data.reportLayout || "FULL" // ✅ Save Layout Preference
        }
      });
    } else {
      // CREATE New
      await prisma.customFieldDefinition.create({
        data: {
          labId,
          name: data.name,
          type: data.type,
          options: data.options || [],
          printOnReport: data.printOnReport ?? true,
          reportLayout: data.reportLayout || "FULL" // ✅ Save Layout Preference
        }
      });
    }

    revalidatePath('/lab-owner/test-management');
    return { success: true };

  } catch (error: any) {
    console.error("Save Custom Field Error:", error);
    // Return error message if name already exists
    if (error.code === 'P2002') {
        throw new Error("A field with this name already exists.");
    }
    throw new Error("Failed to save field");
  }
}

// --- 3. DELETE DEFINITION ---
export async function deleteCustomField(id: string) {
  const labId = await getLabId();
  
  try {
    await prisma.customFieldDefinition.delete({
      where: { id, labId }
    });
    revalidatePath('/lab-owner/test-management');
    return { success: true };
  } catch (error: any) {
    console.error("Delete Custom Field Error:", error);
    if (error.code === 'P2003') {
        throw new Error("Cannot delete: This field is currently used in one or more Test Templates.");
    }
    throw new Error("Failed to delete field");
  }
}