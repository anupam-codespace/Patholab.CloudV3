import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth"; // Using your secure session helper

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    // 1. Secure Authentication via Session Token
    const user = await getCurrentUser();
    
    if (!user || !user.labId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const entity = searchParams.get("entity");
    const action = searchParams.get("action");
    const limit = parseInt(searchParams.get("limit") || "100");

    // 2. Base Filter: Isolate data to the current Lab Enterprise
    const whereClause: any = { 
        labId: user.labId 
    };

    // 3. Branch-Level Data Isolation (Row-Level Security)
    // If the user is NOT an owner/admin, restrict them to their specific branch
    if (user.role !== "LAB_OWNER" && user.role !== "SUPER_ADMIN" && user.branchId) {
        whereClause.branchId = user.branchId;
    }

    if (entity && entity !== "ALL") whereClause.entity = entity;
    if (action && action !== "ALL") whereClause.action = action;

    const logs = await prisma.auditLog.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      take: limit,
      // Note: If you updated your schema to make userId a proper relation to the User table,
      // uncomment the line below to directly fetch the user's name instead of mapping it manually.
      // include: { user: { select: { name: true, role: true } } }
    });

    return NextResponse.json({ logs });
  } catch (error) {
    console.error("[AUDIT_LOG_GET_ERROR]:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}