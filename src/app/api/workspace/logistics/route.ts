import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.labId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const fleetRecords = await prisma.labStaff.findMany({
      where: { labId: user.labId, isActive: true },
      include: {
        user: { select: { id: true, name: true, phone: true, role: true } },
      },
    });

    const fleet = fleetRecords.map((staff) => ({
      id: staff.user.id,
      name: staff.user.name,
      phone: staff.user.phone || "No Phone",
      status: "AVAILABLE",
      type: staff.position || staff.user.role,
      battery: "--",
      task: null,
    }));

    const trips = await prisma.homeCollectionTrip.findMany({
      where: {
        labId: user.labId,
        status: { in: ["SCHEDULED", "STARTED", "IN_PROGRESS"] },
      },
      include: {
        phlebotomist: { select: { name: true } },
        appointments: {
          include: {
            patient: { select: { name: true, phone: true, address: true } },
          },
        },
      },
      orderBy: { scheduledDate: "asc" },
    });

    const tasks = trips.flatMap((trip) =>
      trip.appointments.map((appointment) => ({
        id: trip.id.slice(-6).toUpperCase(),
        tripId: trip.id,
        type: "HOME_COLLECTION",
        client: appointment.patient.name,
        address:
          appointment.collectionAddress ||
          appointment.patient.address ||
          trip.startLocation ||
          "Address not provided",
        timeWindow: new Date(trip.scheduledDate).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        status: trip.status,
        assignedTo: trip.phlebotomist.name,
        requirements: ["Standard Protocol"],
      })),
    );

    return NextResponse.json({ fleet, tasks });
  } catch (error) {
    console.error("[LOGISTICS_GET]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
