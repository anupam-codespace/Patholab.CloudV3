import { PrismaClient } from "@prisma/client";
import { notFound } from "next/navigation";
import TestCatalogClient from "@/components/portal/TestCatalogClient";

const prisma = new PrismaClient();

export const revalidate = 3600;

export default async function PublicBookingPage({
  params,
}: {
  params: { portalSlug: string };
}) {
  const lab = await prisma.lab.findUnique({
    where: { portalSlug: params.portalSlug, isActive: true },
    select: {
      id: true,
      name: true,
      logo: true,
      city: true,
      phone: true,
    },
  });

  if (!lab) {
    notFound();
  }

  // Fetch Public Test Catalog — use TestCategory relation
  const tests = await prisma.testTemplate.findMany({
    where: {
      labId: lab.id,
      isActive: true,
      isPublic: true,
    },
    select: {
      id: true,
      name: true,
      code: true,
      price: true,
      tatHours: true,
      description: true,
      preRequistes: true,
      TestCategory: { select: { name: true } },
    },
    orderBy: { name: "asc" },
  });

  const serializedTests = tests.map((t) => ({
    ...t,
    price: Number(t.price),
    category: t.TestCategory ? { name: t.TestCategory.name } : null,
  }));

  return (
    <main className="min-h-screen bg-muted/30">
      <TestCatalogClient
        lab={lab}
        tests={serializedTests}
        portalSlug={params.portalSlug}
      />
    </main>
  );
}
