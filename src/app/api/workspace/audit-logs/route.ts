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

    // Fetch raw logs from the database
    // IMPORTANT: If your schema uses 'activityLog', change 'prisma.auditLog' to 'prisma.activityLog'
    const rawLogs = await prisma.auditLog.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      take: limit,
      // include: { user: { select: { name: true, role: true } } }
    });

    // 4. CRITICAL FIX: Map the raw DB rows to match the Frontend Interface
    const formattedLogs = rawLogs.map((log: any) => {
      // Safely extract the JSON payload (handles both stringified and native JSON)
      const details = typeof log.details === 'string' 
        ? JSON.parse(log.details) 
        : (log.details || {});
      
      return {
        id: log.id,
        userId: log.userId, // If you uncommented include: { user }, use log.user?.name || log.userId here
        entity: log.entity || "UNKNOWN",
        entityId: log.entityId || "N/A",
        action: log.action,
        
        // Pull the dynamic data OUT of the details object and put it at the top level
        oldData: details?.oldData || null,
        newData: details?.newData || null,
        ipAddress: details?.ipAddress || details?.ip || null,
        
        createdAt: log.createdAt,
      };
    });

    // Return the formatted logs to the frontend
    return NextResponse.json({ logs: formattedLogs });

  } catch (error) {
    console.error("[AUDIT_LOG_GET_ERROR]:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}