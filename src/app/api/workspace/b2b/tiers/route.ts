import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDataFromToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

async function getAuthenticatedLabId(req: NextRequest): Promise<string | null> {
  const user = await getDataFromToken(req);
  if (!user) return null;
  const userId = user.userId || user.id;
  if (user.labId) return user.labId;

  if (userId) {
    const lab = await prisma.lab.findFirst({
      where: { ownerId: userId },
      select: { id: true },
    });
    if (lab) return lab.id;

    const staff = await prisma.labStaff.findFirst({
      where: { userId, isActive: true },
      select: { labId: true },
    });
    if (staff) return staff.labId;

    if (user.role === "SUPER_ADMIN") {
      const firstLab = await prisma.lab.findFirst({
        where: { isActive: true },
        select: { id: true },
      });
      if (firstLab) return firstLab.id;
    }
  }

  return null;
}

export async function GET(req: NextRequest) {
  try {
    const labId = await getAuthenticatedLabId(req);
    if (!labId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [rules, catalogTests] = await Promise.all([
      prisma.b2BTierRule.findMany({
        where: { labId },
        orderBy: [{ tier: "asc" }, { testName: "asc" }],
      }),
      prisma.testTemplate.findMany({
        where: {
          deletedAt: null,
          OR: [{ labId }, { isGlobal: true }],
        },
        select: { id: true, name: true, price: true },
        orderBy: { name: "asc" },
      }),
    ]);

    const groupedRules: Record<string, any[]> = {
      STANDARD: [],
      BRONZE: [],
      SILVER: [],
      GOLD: [],
      PLATINUM: [],
    };

    rules.forEach((r) => {
      const tierKey = r.tier ? r.tier.toUpperCase() : "STANDARD";
      if (!groupedRules[tierKey]) {
        groupedRules[tierKey] = [];
      }
      groupedRules[tierKey].push({
        id: r.id,
        testTemplateId: r.testTemplateId,
        testName: r.testName,
        basePrice: Number(r.basePrice) || 0,
        ruleType: r.ruleType,
        value: Number(r.value) || 0,
        tier: r.tier,
      });
    });

    return NextResponse.json({
      success: true,
      rules,
      groupedRules,
      catalog: catalogTests.map((t) => ({
        id: t.id,
        name: t.name,
        price: Number(t.price) || 0,
      })),
    });
  } catch (error: any) {
    console.error("GET /api/workspace/b2b/tiers Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch tier rules" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const labId = await getAuthenticatedLabId(req);
    if (!labId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { tier, rules, action } = body;

    if (!tier || typeof tier !== "string") {
      return NextResponse.json(
        { error: "Tier name is required" },
        { status: 400 }
      );
    }

    const tierUpper = tier.trim().toUpperCase();

    // 1. Bulk Action: Clear All
    if (action === "CLEAR_ALL") {
      await prisma.b2BTierRule.deleteMany({
        where: { labId, tier: tierUpper },
      });

      return NextResponse.json({
        success: true,
        message: `All rules cleared for ${tierUpper}`,
        tier: tierUpper,
        rules: [],
      });
    }

    // 2. Bulk Action: Add All Tests from Catalog
    if (action === "ADD_ALL_CATALOG") {
      const catalogTests = await prisma.testTemplate.findMany({
        where: {
          deletedAt: null,
          OR: [{ labId }, { isGlobal: true }],
        },
        select: { id: true, name: true, price: true },
        orderBy: { name: "asc" },
      });

      const existingRules = await prisma.b2BTierRule.findMany({
        where: { labId, tier: tierUpper },
        select: { testTemplateId: true },
      });
      const existingIds = new Set(existingRules.map((r) => r.testTemplateId));

      const newTests = catalogTests.filter((t) => !existingIds.has(t.id));
      if (newTests.length > 0) {
        await prisma.b2BTierRule.createMany({
          data: newTests.map((t) => ({
            labId,
            tier: tierUpper,
            testTemplateId: t.id,
            testName: t.name,
            basePrice: Number(t.price) || 0,
            ruleType: "NET_PRICE",
            value: Number(t.price) || 0,
          })),
        });
      }

      const updatedRules = await prisma.b2BTierRule.findMany({
        where: { labId, tier: tierUpper },
        orderBy: { testName: "asc" },
      });

      return NextResponse.json({
        success: true,
        message: `Added ${newTests.length} tests to ${tierUpper}`,
        tier: tierUpper,
        rules: updatedRules,
      });
    }

    // 3. Save standard rules list
    if (!Array.isArray(rules)) {
      return NextResponse.json(
        { error: "Rules array is required" },
        { status: 400 }
      );
    }

    // Delete existing rules for this tier & lab, then insert updated rules
    await prisma.$transaction(async (tx) => {
      await tx.b2BTierRule.deleteMany({
        where: { labId, tier: tierUpper },
      });

      if (rules.length > 0) {
        await tx.b2BTierRule.createMany({
          data: rules.map((r: any) => ({
            labId,
            tier: tierUpper,
            testTemplateId: r.testTemplateId,
            testName: r.testName || "Investigation",
            basePrice: Number(r.basePrice) || 0,
            ruleType: r.ruleType || "NET_PRICE",
            value: Number(r.value) || 0,
          })),
        });
      }
    });

    const updatedRules = await prisma.b2BTierRule.findMany({
      where: { labId, tier: tierUpper },
      orderBy: { testName: "asc" },
    });

    return NextResponse.json({
      success: true,
      rules: updatedRules,
      tier: tierUpper,
      message: `${tierUpper} tier rules saved successfully`,
    });
  } catch (error: any) {
    console.error("POST /api/workspace/b2b/tiers Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update tier rules" },
      { status: 500 }
    );
  }
}
