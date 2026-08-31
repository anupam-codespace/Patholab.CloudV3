import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDataFromToken } from "@/lib/auth";
import { formatIST } from "@/lib/timezone";

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getDataFromToken(req);
    if (!user || !user.labId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    // Generate unique track ID
    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const random = Math.floor(1000 + Math.random() * 9000);
    const trackId = `TRK-${dateStr}-${random}`;

    const appointment = await prisma.appointment.update({
      where: { id },
      data: {
        paymentVerified: true,
        paymentVerifiedAt: new Date(),
        paymentVerifiedBy: user.userId || user.id || 'admin',
        trackId,
        status: "CONFIRMED",
      },
    });

    return NextResponse.json({
      success: true,
      trackId,
      message: "Payment verified successfully",
    });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed: " + error.message }, { status: 500 });
  }
}
