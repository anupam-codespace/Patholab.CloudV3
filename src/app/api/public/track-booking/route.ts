import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const appointmentId = req.nextUrl.searchParams.get("appointmentId")?.trim();
  const phone = req.nextUrl.searchParams.get("phone")?.trim();

  if (!appointmentId || !phone) {
    return NextResponse.json({ error: "Reference ID and Phone Number are required." }, { status: 400 });
  }

  try {
    const appointment = await prisma.appointment.findFirst({
      where: {
        id: appointmentId,
        patient: { phone },
      },
      select: {
        id: true,
        labId: true,
      },
    });

    if (!appointment) {
      return NextResponse.json({ error: "Booking not found with this Reference ID and Phone Number." }, { status: 404 });
    }

    const lab = await prisma.lab.findUnique({
      where: { id: appointment.labId },
      select: { portalSlug: true },
    });

    if (!lab || !lab.portalSlug) {
      return NextResponse.json({ error: "Associated laboratory not found." }, { status: 404 });
    }

    return NextResponse.json({ portalSlug: lab.portalSlug });
  } catch (error) {
    console.error("Track booking error:", error);
    return NextResponse.json({ error: "Failed to locate booking." }, { status: 500 });
  }
}
