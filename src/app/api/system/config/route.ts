import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    // 1. Try to find the first configuration row
    let config = await prisma.systemConfig.findFirst();

    // 2. If it doesn't exist, create a default one automatically!
    if (!config) {
      console.log("No SystemConfig found. Creating default configuration...");
      config = await prisma.systemConfig.create({
        data: {
          systemName: "Patholab Cloud",
          primaryColor: "#3b82f6",
          secondaryColor: "#8b5cf6",
          seoTitle: "Patholab Cloud - Modern LIMS",
          currency: "INR",
          currencySymbol: "₹",
          // You can add more default fallback values here if needed
        },
      });
    }

    // 3. Return the config (it will definitely exist now)
    return NextResponse.json(config, { status: 200 });

  } catch (error) {
    console.error("System Config API Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch system configuration" },
      { status: 500 }
    );
  }
}