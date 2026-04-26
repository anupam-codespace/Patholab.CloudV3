import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email");
    const secretKey = req.headers.get("x-api-key");

    // 1. Security Check: Only WooCommerce is allowed to ask this
    if (secretKey !== process.env.WOOCOMMERCE_WEBHOOK_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // 2. Check your actual PostgreSQL database
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        lab: {
          include: { subscription: true }
        }
      }
    });

    // 3. Determine if they already have an active workspace
    const hasBasePlan = !!(user?.lab?.subscription);

    return NextResponse.json({ 
      exists: !!user, 
      hasBasePlan: hasBasePlan 
    }, { status: 200 });

  } catch (error) {
    console.error("Check User API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}