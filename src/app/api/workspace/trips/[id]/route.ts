import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.labId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { phlebotomistId } = await req.json();
    if (!phlebotomistId || typeof phlebotomistId !== "string") {
      return NextResponse.json(
        { error: "Phlebotomist ID is required." },
        { status: 400 },
      );
    }

    const validStaff = await prisma.user.findFirst({
      where: {
        id: phlebotomistId,
        role: "PHLEBOTOMIST",
        isActive: true,
        staffLabs: { some: { labId: user.labId, isActive: true } },
      },
      select: { id: true },
    });

    if (!validStaff) {
      return NextResponse.json(
        { error: "Invalid or inactive phlebotomist." },
        { status: 403 },
      );
    }

    const trip = await prisma.homeCollectionTrip.findFirst({
      where: { id: params.id, labId: user.labId },
      select: { id: true },
    });

    if (!trip) {
      return NextResponse.json({ error: "Trip not found." }, { status: 404 });
    }

    const updatedTrip = await prisma.homeCollectionTrip.update({
      where: { id: trip.id },
      data: { phlebotomistId },
    });

    return NextResponse.json({ success: true, trip: updatedTrip });
  } catch (error) {
    console.error("Trip Reassignment Error:", error);
    return NextResponse.json(
      { error: "Failed to reassign trip." },
      { status: 500 },
    );
  }
}
