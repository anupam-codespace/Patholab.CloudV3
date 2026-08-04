import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const labId = user?.labId;
    if (!user || !labId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { phlebotomistId, scheduledDate, appointmentIds, startLocation } =
      await req.json();

    if (
      !phlebotomistId ||
      !scheduledDate ||
      !Array.isArray(appointmentIds) ||
      appointmentIds.length === 0 ||
      !appointmentIds.every((id) => typeof id === "string")
    ) {
      return NextResponse.json(
        { error: "Phlebotomist, date, and at least one appointment are required." },
        { status: 400 },
      );
    }

    const tripDate = new Date(scheduledDate);
    if (Number.isNaN(tripDate.getTime())) {
      return NextResponse.json({ error: "Invalid scheduled date." }, { status: 400 });
    }

    const uniqueAppointmentIds = Array.from(new Set(appointmentIds));
    const validPhlebotomist = await prisma.user.findFirst({
      where: {
        id: phlebotomistId,
        role: "PHLEBOTOMIST",
        isActive: true,
        staffLabs: { some: { labId, isActive: true } },
      },
      select: { id: true },
    });

    if (!validPhlebotomist) {
      return NextResponse.json(
        { error: "Invalid or inactive phlebotomist selected." },
        { status: 403 },
      );
    }

    const trip = await prisma.$transaction(async (tx) => {
      const newTrip = await tx.homeCollectionTrip.create({
        data: {
          labId,
          phlebotomistId,
          scheduledDate: tripDate,
          startLocation: startLocation || "Main Lab",
          status: "SCHEDULED",
          branchId: user.branchId || undefined,
        },
      });

      const updateResult = await tx.appointment.updateMany({
        where: {
          id: { in: uniqueAppointmentIds },
          labId,
          collectionMode: "HOME_COLLECTION",
          // 🚀 HERE IS THE FIX: Allow both SCHEDULED and PENDING_PAYMENT
          status: { in: ["SCHEDULED", "PENDING_PAYMENT"] }, 
          tripId: null,
        },
        data: { tripId: newTrip.id, status: "ASSIGNED" },
      });

      if (updateResult.count !== uniqueAppointmentIds.length) {
        throw new Error(
          `Only ${updateResult.count} of ${uniqueAppointmentIds.length} appointments were available.`
        );
      }

      return newTrip;
    });

    return NextResponse.json({
      success: true,
      message: "Trip created and appointments assigned successfully!",
      trip,
    });
  } catch (error: any) {
    // 💡 Pro-tip: Logging the error.message helps debug transaction rollbacks much faster!
    console.error("Trip Assignment Error:", error.message || error);
    return NextResponse.json({ error: "Failed to assign trip." }, { status: 500 });
  }
}