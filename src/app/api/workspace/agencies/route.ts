import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDataFromToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

async function getAuthenticatedLabId(req: NextRequest): Promise<string | null> {
  const user = await getDataFromToken(req);
  if (!user) return null;
  if (user.labId) return user.labId;

  const userId = user.userId || user.id;
  if (!userId) return null;

  const lab = await prisma.lab.findFirst({
    where: { ownerId: userId },
    select: { id: true },
  });
  if (lab) return lab.id;

  const staff = await prisma.labStaff.findFirst({
    where: { userId, isActive: true },
    select: { labId: true },
  });
  return staff?.labId || null;
}

export async function GET(req: NextRequest) {
  try {
    const labId = await getAuthenticatedLabId(req);
    if (!labId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const agencies = await prisma.agency.findMany({
      where: { labId, isActive: true, deletedAt: null },
      select: {
        id: true,
        agencyName: true,
        contactPerson: true,
        phone: true,
        email: true,
        agencyTier: true,
        commissionRate: true,
        commissionType: true,
      },
      orderBy: { agencyName: "asc" },
    });

    return NextResponse.json({
      success: true,
      agencies,
    });
  } catch (error: any) {
    console.error("GET /api/workspace/agencies Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch agencies" },
      { status: 500 }
    );
  }
}
