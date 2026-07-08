"use server";

import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

// ─── Helpers ────────────────────────────────────────────

// Get lab ID with user check
async function getLabIdOrThrow() {
  const user = await getCurrentUser();
  if (!user?.labId) throw new Error("Unauthorized");
  return user.labId;
}

// ─── Get All Templates (Gallery) ──────────────────────

export async function getAllTemplates() {
  const labId = await getLabIdOrThrow();

  // Fetch all templates that belong to this lab OR are global
  const templates = await prisma.reportTemplate.findMany({
    where: {
      OR: [
        { labId: labId },
        { labId: null, type: "GLOBAL" },
      ],
    },
    include: {
      parent: true, // to show which global template it was copied from
    },
    orderBy: [
      { type: 'asc' }, // GLOBAL first, then LOCAL, etc.
      { createdAt: 'desc' },
    ],
  });

  return templates;
}

// ─── Get Single Template ──────────────────────────────

export async function getTemplateById(templateId: string) {
  const labId = await getLabIdOrThrow();

  const template = await prisma.reportTemplate.findUnique({
    where: { id: templateId },
    include: {
      parent: true,
      headerTemplate: true,
      footerTemplate: true,
    },
  });

  if (!template) return null;
  // Allow access if it's global or belongs to this lab
  if (template.labId !== labId && template.labId !== null) return null;
  return template;
}

// ─── Create Template (from scratch) ──────────────────

export async function createTemplate(
  name: string,
  type: "GLOBAL" | "LOCAL" | "HEADLESS" | "HEADER" | "FOOTER" | "PAGE",
  config: any = {},
  options: {
    parentId?: string;
    isActive?: boolean;
    pageSize?: string;
    orientation?: string;
    primaryColor?: string;
    accentColor?: string;
    fontFamily?: string;
    logoUrl?: string;
    headerImage?: string;
    footerImage?: string;
  } = {}
) {
  const labId = await getLabIdOrThrow();

  // Only admins can create global templates (you can add role check here)
  if (type === "GLOBAL") {
    // For now, we'll allow only if user is admin (add your own check)
    // throw new Error("Only administrators can create global templates");
  }

  const isFirst = type === "LOCAL" && await prisma.reportTemplate.count({
    where: { labId, type: "LOCAL" },
  }) === 0;

  const template = await prisma.reportTemplate.create({
    data: {
      labId: type === "GLOBAL" ? null : labId,
      name,
      type,
      config,
      isActive: isFirst || options.isActive || false,
      pageSize: options.pageSize || "A4",
      orientation: options.orientation || "PORTRAIT",
      primaryColor: options.primaryColor || "#1e3a8a",
      accentColor: options.accentColor || "#2563eb",
      fontFamily: options.fontFamily || "Inter",
      logoUrl: options.logoUrl || "",
      headerImage: options.headerImage || "",
      footerImage: options.footerImage || "",
      parentId: options.parentId || null,
    },
  });

  revalidatePath('/workspace/settings/templates');
  return template;
}

// ─── Copy Global Template to Local ────────────────────

export async function copyTemplateToLocal(globalTemplateId: string) {
  const labId = await getLabIdOrThrow();

  // Fetch the global template
  const globalTemplate = await prisma.reportTemplate.findUnique({
    where: { id: globalTemplateId, type: "GLOBAL" },
  });
  if (!globalTemplate) throw new Error("Global template not found");

  // Check if this lab already has a copy of this template
  const existingCopy = await prisma.reportTemplate.findFirst({
    where: {
      parentId: globalTemplateId,
      labId: labId,
    },
  });
  if (existingCopy) {
    return existingCopy;
  }

  // Create a local copy
  const localCopy = await prisma.reportTemplate.create({
    data: {
      labId: labId,
      name: `${globalTemplate.name} (Copy)`,
      type: "LOCAL",
      isActive: false,
      config: globalTemplate.config,
      pageSize: globalTemplate.pageSize,
      orientation: globalTemplate.orientation,
      primaryColor: globalTemplate.primaryColor,
      accentColor: globalTemplate.accentColor,
      fontFamily: globalTemplate.fontFamily,
      logoUrl: globalTemplate.logoUrl,
      headerImage: globalTemplate.headerImage,
      footerImage: globalTemplate.footerImage,
      isoMarkUrl: globalTemplate.isoMarkUrl,
      watermarkUrl: globalTemplate.watermarkUrl,
      parentId: globalTemplateId,
    },
  });

  revalidatePath('/workspace/settings/templates');
  return localCopy;
}

// ─── Save/Update Template ─────────────────────────────

export async function saveTemplate(
  templateId: string | null,
  name: string,
  config: any,
  options = {}
) {
  const labId = await getLabIdOrThrow();

  let result;
  if (templateId) {
    result = await prisma.reportTemplate.update({
      where: { id: templateId },
      data: { name, config, ...options },
    });
  } else {
    const count = await prisma.reportTemplate.count({
      where: { labId, type: "LOCAL" },
    });
    result = await prisma.reportTemplate.create({
      data: {
        labId,
        name,
        type: "LOCAL",
        config,
        isActive: count === 0,
        ...options,
      },
    });
  }

  revalidatePath('/workspace/settings/templates');
  return result; // ✅ return the full template object
}

// ─── Set Active Template ──────────────────────────────

export async function setActiveTemplate(templateId: string) {
  const labId = await getLabIdOrThrow();

  await prisma.$transaction([
    prisma.reportTemplate.updateMany({
      where: { labId, type: "LOCAL" },
      data: { isActive: false },
    }),
    prisma.reportTemplate.update({
      where: { id: templateId, labId },
      data: { isActive: true },
    }),
  ]);

  revalidatePath('/workspace/settings/templates');
  revalidatePath('/workspace/reports/print');
  return { success: true };
}

// ─── Delete Template ──────────────────────────────────

export async function deleteTemplate(templateId: string) {
  const labId = await getLabIdOrThrow();

  // Check if it's a global template – only admins can delete
  const template = await prisma.reportTemplate.findUnique({
    where: { id: templateId },
  });
  if (!template) throw new Error("Template not found");

  // Allow deletion only if it belongs to this lab (or is global and admin – add check later)
  if (template.labId && template.labId !== labId) throw new Error("Unauthorized");
  if (template.type === "GLOBAL") {
    // For now, we'll allow all deletion; add role check if needed
    // throw new Error("Only administrators can delete global templates");
  }

  await prisma.reportTemplate.delete({
    where: { id: templateId },
  });

  revalidatePath('/workspace/settings/templates');
  return { success: true };
}

// ─── Update Template Name ─────────────────────────────

export async function updateTemplateName(templateId: string, name: string) {
  const labId = await getLabIdOrThrow();
  const template = await prisma.reportTemplate.findUnique({
    where: { id: templateId },
  });
  if (!template) throw new Error("Template not found");
  if (template.labId && template.labId !== labId) throw new Error("Unauthorized");

  await prisma.reportTemplate.update({
    where: { id: templateId },
    data: { name },
  });

  revalidatePath('/workspace/settings/templates');
  return { success: true };
}

// ─── Get Global Templates (for display) ──────────────

export async function getGlobalTemplates() {
  return prisma.reportTemplate.findMany({
    where: { type: "GLOBAL" },
    orderBy: { createdAt: 'desc' },
  });
}

// ─── Get Lab Templates ───────────────────────────────

export async function getLabTemplates() {
  const labId = await getLabIdOrThrow();
  return prisma.reportTemplate.findMany({
    where: { labId, type: "LOCAL" },
    orderBy: { createdAt: 'desc' },
  });
}