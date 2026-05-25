import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getDataFromToken } from "@/lib/auth"; // Your auth helper

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    const user = await getDataFromToken(req);
    
    // Fetch only appointments made via the public portal
    const appointments = await prisma.appointment.findMany({
      where: { 
        labId: user.labId,
        source: "ONLINE_PORTAL" 
      },
      include: {
        patient: { select: { name: true, phone: true } },
        tests: { select: { testName: true } },
        invoice: { select: { grandTotal: true, paymentStatus: true } }
      },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json(appointments);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch bookings" }, { status: 500 });
  }
}