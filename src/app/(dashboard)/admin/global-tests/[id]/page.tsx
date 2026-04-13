import prisma from "@/lib/prisma";
import { GlobalTestForm } from "../_components/GlobalTestForm";
import { notFound } from "next/navigation";

export default async function EditGlobalTestPage({
  params,
}: {
  params: { id: string };
}) {
  const test = await prisma.testTemplate.findUnique({
    where: { id: params.id, isGlobal: true },
  });

  if (!test) notFound();

  // Convert Prisma Decimals to Numbers for the form
  const serializedTest = {
    ...test,
    price: Number(test.price),
    b2bPrice: Number(test.b2bPrice || 0),
    cost: Number(test.cost || 0),
  };

  return (
    <div className="p-6">
      <GlobalTestForm initialData={serializedTest} />
    </div>
  );
}
