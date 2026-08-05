"use server";

import { prisma } from "@/lib/prisma"; // <--- FIX: Added curly braces here
import { getCurrentUser } from "@/lib/auth"; 

// Fetch all rules and group them by Tier
export async function getTierRules() {
  const user = await getCurrentUser();
  if (!user || !user.labId) throw new Error("Unauthorized");

  const rules = await prisma.b2BTierRule.findMany({
    where: { labId: user.labId },
  });

  // Group by tier for the frontend
  const groupedRules: Record<string, any[]> = {
    STANDARD: [],
    BRONZE: [],
    SILVER: [],
    GOLD: [],
    PLATINUM: [],
  };

  rules.forEach((rule) => {
    if (groupedRules[rule.tier]) {
      groupedRules[rule.tier].push(rule);
    }
  });

  return groupedRules;
}

// Save rules for a specific tier
export async function updateTierRules(tier: string, rules: any[]) {
  const user = await getCurrentUser();
  if (!user || !user.labId) throw new Error("Unauthorized");

  // We use a transaction to delete old rules for this tier and insert the new ones
  await prisma.$transaction(async (tx) => {
    // 1. Delete existing rules for this specific tier & lab
    await tx.b2BTierRule.deleteMany({
      where: {
        labId: user.labId,
        tier: tier,
      },
    });

    // 2. Insert the updated list of rules
    if (rules.length > 0) {
      const dataToInsert = rules.map((r) => ({
        tier: tier,
        testTemplateId: r.testTemplateId,
        testName: r.testName,
        basePrice: r.basePrice,
        ruleType: r.ruleType,
        value: r.value,
        labId: user.labId!, 
      }));

      await tx.b2BTierRule.createMany({
        data: dataToInsert,
      });
    }
  });

  return { success: true };
}