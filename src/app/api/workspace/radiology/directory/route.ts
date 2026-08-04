// File: src/app/api/workspace/radiology/directory/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.labId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("query") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = 20;
    const skip = (page - 1) * limit;

    const searchQuery = query ? {
      OR: [
        { patient: { name: { contains: query, mode: "insensitive" } } },
        { patient: { phone: { contains: query } } },
        { accessionNumber: { contains: query, mode: "insensitive" } },
      ]
    } : {};

    // THE FIX: We are now checking for valid "completed" statuses from your Enum
    const whereClause = {
      labId: user.labId, // Security check
      report: {
        is: {
          status: {
            // Include all statuses that mean the report is done
            in: ["APPROVED", "FINAL", "AMENDED", "PRINTED", "SENT_TO_PATIENT"]
          }
        }
      },
      ...(query ? searchQuery : {}),
    };

    const [studies, total] = await Promise.all([
      prisma.radiologyStudy.findMany({
        where: whereClause,
        include: {
          patient: true,
          report: true,
          modality: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.radiologyStudy.count({
        where: whereClause,
      })
    ]);

    return NextResponse.json({
      success: true,
      studies,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      }
    });
  } catch (error) {
    console.error("Directory Fetch Error:", error);
    return NextResponse.json({ error: "Failed to fetch directory" }, { status: 500 });
  }
}