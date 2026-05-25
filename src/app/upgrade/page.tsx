import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import UpgradeClient from "./UpgradeClient";

export default async function UpgradePage({
  searchParams,
}: {
  searchParams: { reason?: string; feature?: string };
}) {
  // 1. Get User Session securely
  const session = await getSession();
  if (!session || !session.labId) {
    redirect("/login");
  }

  // 2. Fetch the Lab's Current Subscription Details
  const currentSubscription = await prisma.subscription.findUnique({
    where: { labId: session.labId },
    include: {
      plan: true, // Join the plan details
    },
  });

  // 3. Fetch All Available Active Plans
  // Ordered by price so Basic -> Pro -> Enterprise shows in order
  const plans = await prisma.plan.findMany({
    where: { isActive: true },
    orderBy: { price: "asc" },
  });

  // 4. Fetch All Available Active Modular Add-ons
  const addOns = await prisma.addOn.findMany({
    where: { isActive: true },
    orderBy: { price: "asc" },
  });

  return (
    <UpgradeClient
      currentSub={currentSubscription}
      plans={plans}
      addOns={addOns}
      reason={searchParams.reason}
      feature={searchParams.feature}
    />
  );
}
