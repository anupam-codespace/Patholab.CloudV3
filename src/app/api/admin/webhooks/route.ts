import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    // Security check: Only SUPER_ADMIN can view webhook logs
    if (!user || user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden: Super Admin access required" }, { status: 403 });
    }

    // Extract query parameters for filtering (e.g., ?status=FAILED)
    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get("status");

    // Fetch the logs (Most recent first)
    const logs = await prisma.webhookLog.findMany({
      where: statusFilter ? { status: statusFilter as any } : {},
      orderBy: { createdAt: 'desc' },
      take: 100, // Limit to recent 100 to keep the API fast
    });

    return NextResponse.json({ logs }, { status: 200 });

  } catch (error) {
    console.error("Admin Webhook API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}