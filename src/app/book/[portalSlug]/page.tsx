import { PrismaClient } from "@prisma/client";
import { notFound } from "next/navigation";
import TestCatalogClient from "@/components/portal/TestCatalogClient";
import { resolvePublicLabId } from "@/lib/public-lab";

const prisma = new PrismaClient();

// Optional: Revalidate this page every hour so it stays fast but updates new prices
export const revalidate = 3600;

export default async function PublicBookingPage({
  params,
}: {
  params: { portalSlug: string };
}) {
  // 1. Fetch Lab Details
  const labId = await resolvePublicLabId(params.portalSlug);
  if (!labId) notFound();
  const lab = await prisma.lab.findUnique({
    where: { id: labId },
    select: {
      id: true,
      name: true,
      logo: true,
      city: true,
      phone: true,
      upiId: true,
      upiQrCode: true,
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
    },
    select: {
      id: true,
      name: true,
      code: true,
      price: true,
      tatHours: true,
      description: true,
      
      TestCategory: { select: { name: true } },
    },
    orderBy: { name: "asc" },
  });

  // Convert Prisma Decimal to string/number for the Client Component
  const serializedTests = tests.map((t) => ({
    ...t,
    price: Number(t.price),
    tat: t.tatHours,
    category: t.TestCategory,
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
