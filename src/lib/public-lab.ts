import { prisma } from "@/lib/prisma";

const slugify = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");

// Supports labs created before portalSlug was introduced, while preserving an
// explicitly configured slug when one exists.
export async function resolvePublicLabId(portalSlug: string): Promise<string | null> {
  const direct = await prisma.lab.findUnique({ where: { portalSlug }, select: { id: true } });
  if (direct) return direct.id;

  const labs = await prisma.lab.findMany({ where: { deletedAt: null }, select: { id: true, name: true } });
  return labs.find((lab) => slugify(lab.name) === portalSlug)?.id ?? null;
}
