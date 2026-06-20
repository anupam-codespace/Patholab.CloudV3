import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    // 1. Secure Authentication
    const user = await getCurrentUser();
    if (!user || user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const type = searchParams.get("type") || "TENANT"; 
    const labId = searchParams.get("labId") || "ALL";
    const category = searchParams.get("category") || "ALL";
    const actionType = searchParams.get("action") || "ALL";
    const search = searchParams.get("search") || "";

    const skip = (page - 1) * limit;

    // 2. Build Query Constraints safely without assuming direct Lab relation on ActivityLog
    const whereClause: any = {};

    // SPLIT: Super Admin Logs vs Tenant Labs Logs
    if (type === "ADMIN") {
      whereClause.user = { role: "SUPER_ADMIN" };
    } else {
      whereClause.user = { role: { not: "SUPER_ADMIN" } };
      
      // If a specific lab is selected, filter through the user's relationships
      if (labId !== "ALL") {
        whereClause.user = {
          ...whereClause.user,
          OR: [
            { lab: { id: labId } }, // If user is LAB_OWNER
            { staffLabs: { some: { labId: labId } } } // If user is LAB_STAFF
          ]
        };
      }
    }

    // Filter by Entity/Category
    if (category !== "ALL") {
      whereClause.entity = category; 
    }

    // Filter by Action
    if (actionType !== "ALL") {
      whereClause.action = actionType;
    }

    // Free-text Search
    if (search) {
      whereClause.OR = [
        { description: { contains: search, mode: "insensitive" } },
        { user: { name: { contains: search, mode: "insensitive" } } },
        { user: { email: { contains: search, mode: "insensitive" } } },
      ];
    }

    // 3. Execute Parallel Queries
    const [logs, total] = await Promise.all([
      prisma.activityLog.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          // Fetch Lab details safely THROUGH the user relation
          user: { 
            select: { 
              name: true, 
              email: true, 
              role: true,
              lab: { select: { name: true } },
              staffLabs: { select: { lab: { select: { name: true } } } }
            } 
          },
        },
      }),
      prisma.activityLog.count({ where: whereClause }),
    ]);

    // 4. Fetch Active Labs for the Frontend Dropdown Filter
    let activeLabs = [];
    if (type === "TENANT") {
      activeLabs = await prisma.lab.findMany({
        select: { id: true, name: true },
        orderBy: { name: 'asc' }
      });
    }

    return NextResponse.json({
      data: logs,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      filters: {
        labs: activeLabs,
      },
    });
  } catch (error) {
    console.error("[ADMIN_ACTIVITY_API_ERROR]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}