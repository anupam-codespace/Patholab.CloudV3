import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "SUPER_ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const payments = await prisma.payment.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        subscription: {
          include: {
            lab: { select: { name: true, labCode: true, owner: { select: { name: true, email: true } } } },
            plan: { select: { displayName: true } }
          }
        }
      }
    });

    return NextResponse.json({ payments }, { status: 200 });
  } catch (error) {
    console.error("Admin Payments API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}