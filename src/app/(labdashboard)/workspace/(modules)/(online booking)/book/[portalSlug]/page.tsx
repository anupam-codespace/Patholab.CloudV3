import { PrismaClient } from "@prisma/client";
import { notFound } from "next/navigation";
import TestCatalogClient from "@/components/portal/TestCatalogClient";

const prisma = new PrismaClient();

// Optional: Revalidate this page every hour so it stays fast but updates new prices
export const revalidate = 3600;

export default async function PublicBookingPage({
  params,
}: {
  params: { portalSlug: string };
}) {
  // 1. Fetch Lab Details
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
    notFound(); // Shows 404 if the lab doesn't exist or slug is wrong
  }

  // 2. Fetch Public Test Catalog
  const tests = await prisma.testTemplate.findMany({
    where: {
      labId: lab.id,
      isActive: true,
      isPublic: true, // ONLY show tests marked for the public portal
    },
    select: {
      id: true,
      name: true,
      code: true,
      price: true,
      tatHours: true,
      description: true,
      preRequistes: true,
      category: { select: { name: true } },
    },
    orderBy: { name: "asc" },
  });

  // Convert Prisma Decimal to string/number for the Client Component
  const serializedTests = tests.map((t) => ({
    ...t,
    price: Number(t.price),
  }));

  return (
    <main className="min-h-screen bg-slate-50">
      <TestCatalogClient
        lab={lab}
        tests={serializedTests}
        portalSlug={params.portalSlug}
      />
    </main>
  );
}
