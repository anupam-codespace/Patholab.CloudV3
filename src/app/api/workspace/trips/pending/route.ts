import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.labId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

  // 1. Fetch pending home collections
const pendingAppointments = await prisma.appointment.findMany({
  where: {
    labId: user.labId,
    collectionMode: "HOME_COLLECTION",
    tripId: null,
    // 🚀 FIX: Fetch both SCHEDULED (Admin book) and PENDING_PAYMENT (Public Portal)
    status: { in: ["SCHEDULED", "PENDING_PAYMENT"] }, 
  },
  include: {
    patient: { select: { name: true, phone: true } }
  },
  orderBy: { appointmentDate: "asc" }
});

    // 2. Fetch available phlebotomists (Staff linked to this lab with the PHLEBOTOMIST role)
    const phlebotomists = await prisma.user.findMany({
      where: {
        role: "PHLEBOTOMIST",
        staffLabs: { some: { labId: user.labId } },
        isActive: true
      },
      select: { id: true, name: true, phone: true }
    });

    return NextResponse.json({ 
      success: true, 
      pendingAppointments,
      phlebotomists
    });

  } catch (error) {
    console.error("Pending Trips Fetch Error:", error);
    return NextResponse.json({ error: "Failed to fetch data." }, { status: 500 });
  }
}