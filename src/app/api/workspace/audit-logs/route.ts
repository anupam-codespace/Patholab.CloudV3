import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const labId = req.headers.get("x-lab-id");
    if (!labId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const searchParams = req.nextUrl.searchParams;
    const entity = searchParams.get("entity");
    const action = searchParams.get("action");
    const limit = parseInt(searchParams.get("limit") || "100");

    const whereClause: any = { labId };
    if (entity && entity !== "ALL") whereClause.entity = entity;
    if (action && action !== "ALL") whereClause.action = action;

    const logs = await prisma.auditLog.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    // Note: Since userId is a string reference (to prevent cascade deletion issues), 
    // we fetch the user names manually if needed, or just return the IDs.
    // For a production app with thousands of logs, a simple Prisma query is best.
    
    return NextResponse.json({ logs });
  } catch (error) {
    console.error("Audit Log API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}