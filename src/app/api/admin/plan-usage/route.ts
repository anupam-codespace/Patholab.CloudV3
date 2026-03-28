import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET: List all plans with subscriber counts
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (user?.role !== "SUPER_ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const plans = await prisma.plan.findMany({
      include: {
        _count: {
          select: { subscriptions: true } // Count how many labs use this plan
        }
      },
      orderBy: { price: 'asc' }
    });

    return NextResponse.json(plans);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch plans" }, { status: 500 });
  }
}

// PUT: Update a specific Plan's limits/features
export async function PUT(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (user?.role !== "SUPER_ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const body = await req.json();
    const { id, ...data } = body; // 'id' is the plan ID, 'data' contains the updates

    const updatedPlan = await prisma.plan.update({
      where: { id },
      data: {
        // Allow updating limits
        maxTestsPerMonth: parseInt(data.maxTestsPerMonth),
        maxPatientsTotal: parseInt(data.maxPatientsTotal),
        maxStorageGB: parseFloat(data.maxStorageGB),
        maxStaff: parseInt(data.maxStaff),
        
        // Allow updating feature flags
        hasInventory: data.hasInventory,
        hasWhatsapp: data.hasWhatsapp,
        hasAiPrediction: data.hasAiPrediction,
        hasWhiteLabel: data.hasWhiteLabel,
        
        // Allow updating pricing/display
        isActive: data.isActive,
        displayName: data.displayName
      }
    });

    return NextResponse.json(updatedPlan);
  } catch (error) {
    console.error("Update Plan Error:", error);
    return NextResponse.json({ error: "Failed to update plan" }, { status: 500 });
  }
}