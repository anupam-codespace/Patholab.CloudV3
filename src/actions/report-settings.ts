'use server';

import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

// --- 1. GET ALL TEMPLATES (For Gallery Page) ---
export async function getAllTemplates() {
  const user = await getCurrentUser();
  if (!user?.labId) return [];

  return await prisma.reportTemplate.findMany({
    where: { labId: user.labId },
    orderBy: { createdAt: 'desc' }
  });
}

// --- 2. GET SINGLE TEMPLATE (For Builder) ---
export async function getTemplateById(templateId: string) {
  const user = await getCurrentUser();
  if (!user?.labId) return null;

  return await prisma.reportTemplate.findUnique({
    where: { id: templateId, labId: user.labId } // Security check
  });
}

// --- 3. SAVE / CREATE TEMPLATE ---
export async function saveTemplate(templateId: string | null, name: string, config: any) {
  const user = await getCurrentUser();
  if (!user?.labId) throw new Error("Unauthorized");

  // ✅ v3.2.4 FIX: ReportTemplate.config is declared as String? in the Prisma schema,
  // but the template builder passes a nested JS object. We must JSON.stringify it
  // before saving, otherwise Prisma throws:
  //   "Argument `config`: Invalid value provided. Expected String or Null, provided Object."
  // The reader side (report PDF generator) already does JSON.parse(config) when
  // it loads the template, so round-trip is safe.
  const configString = config == null
    ? null
    : (typeof config === 'string' ? config : JSON.stringify(config));

  // If creating the very first template, make it active automatically
  const count = await prisma.reportTemplate.count({ where: { labId: user.labId } });
  const isFirst = count === 0;

  if (templateId) {
    // UPDATE Existing
    await prisma.reportTemplate.update({
      where: { id: templateId },
      data: { name, config: configString, updatedAt: new Date() }
    });
  } else {
    // CREATE New
    await prisma.reportTemplate.create({
      data: {
        labId: user.labId,
        name: name || "New Template",
        config: configString,
        isActive: isFirst // Auto-activate if it's the first one
      }
    });
  }

  revalidatePath('/workspace/settings/templates');
  return { success: true };
}

// --- 4. SET ACTIVE TEMPLATE ---
export async function setActiveTemplate(templateId: string) {
  const user = await getCurrentUser();
  if (!user?.labId) throw new Error("Unauthorized");

  // Transaction: Deactivate all, Activate one
  await prisma.$transaction([
    prisma.reportTemplate.updateMany({
      where: { labId: user.labId },
      data: { isActive: false }
    }),
    prisma.reportTemplate.update({
      where: { id: templateId, labId: user.labId },
      data: { isActive: true }
    })
  ]);

  revalidatePath('/workspace/settings/templates');
  revalidatePath('/workspace/reports/print'); // Ensure print page updates
  return { success: true };
}

// --- 5. DELETE TEMPLATE ---
export async function deleteTemplate(templateId: string) {
  const user = await getCurrentUser();
  if (!user?.labId) throw new Error("Unauthorized");

  await prisma.reportTemplate.delete({
    where: { id: templateId, labId: user.labId }
  });

  revalidatePath('/workspace/settings/templates');
  return { success: true };
}