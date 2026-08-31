import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDataFromToken } from "@/lib/auth";
import { nowIST } from "@/lib/timezone";

export const dynamic = "force-dynamic";

// ============================================================================
// GET: Trip details with all appointments
// ============================================================================
export async function GET(
  req: NextRequest,
  { params }: { params: { tripId: string } }
) {
  try {
    const user = await getDataFromToken(req);
    if (!user || !user.labId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const trip = await prisma.homeCollectionTrip.findFirst({
      where: { id: params.tripId, labId: user.labId },
      include: {
        phlebotomist: {
          select: { id: true, name: true, phone: true },
        },
        branch: { select: { id: true, name: true } },
        appointments: {
          include: {
            patient: { select: { id: true, name: true, phone: true } },
            tests: {
              select: { id: true, testName: true, testCode: true, status: true },
            },
          },
          orderBy: { routeOrder: "asc" },
        },
      },
    });

    if (!trip) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    return NextResponse.json({ trip });
  } catch (error: any) {
    console.error("[HOME_COLLECTION_TRIP_GET]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// ============================================================================
// PATCH: Update trip status (STARTED | IN_PROGRESS | COMPLETED)
// Body: { status, startLocation?, endLocation?, totalDistance? }
// ============================================================================
export async function PATCH(
  req: NextRequest,
  { params }: { params: { tripId: string } }
) {
  try {
    const user = await getDataFromToken(req);
    if (!user || !user.labId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { status, startLocation, endLocation, totalDistance } = body || {};

    const validStatuses = ["SCHEDULED", "STARTED", "IN_PROGRESS", "COMPLETED"];
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `status must be one of: ${validStatuses.join(", ")}` },
        { status: 400 }
      );
    }

    const existing = await prisma.homeCollectionTrip.findFirst({
      where: { id: params.tripId, labId: user.labId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    const patch: any = { status };
    if (startLocation !== undefined)
      patch.startLocation = startLocation || null;
    if (endLocation !== undefined) patch.endLocation = endLocation || null;
    if (totalDistance !== undefined)
      patch.totalDistance = Number(totalDistance) || null;

    const updated = await prisma.homeCollectionTrip.update({
      where: { id: params.tripId },
      data: patch,
      include: {
        phlebotomist: { select: { id: true, name: true, phone: true } },
        appointments: {
          select: {
            id: true,
            status: true,
            patient: { select: { id: true, name: true, phone: true } },
          },
        },
      },
    });

    // If the trip is being marked as COMPLETED, advance the appointments
    // whose samples were actually collected during this trip.
    if (status === "COMPLETED") {
      await prisma.appointment.updateMany({
        where: { tripId: params.tripId, status: { in: ["EN_ROUTE", "ARRIVED", "ASSIGNED"] } },
        data: { status: "COMPLETED" },
      });
    } else if (status === "STARTED") {
      await prisma.appointment.updateMany({
        where: { tripId: params.tripId, status: "ASSIGNED" },
        data: { status: "EN_ROUTE" },
      });
    } else if (status === "IN_PROGRESS") {
      await prisma.appointment.updateMany({
        where: { tripId: params.tripId, status: "EN_ROUTE" },
        data: { status: "ARRIVED" },
      });
    }

    await prisma.activityLog.create({
      data: {
        labId: user.labId,
        userId: user.userId,
        action: "HOME_COLLECTION_TRIP_STATUS_UPDATED",
        entity: "HomeCollectionTrip",
        entityId: params.tripId,
        entityType: "TRIP",
        description: `Trip status updated to ${status}`,
        details: JSON.stringify({
          previousStatus: existing.status,
          newStatus: status,
          at: nowIST().toISOString(),
        }),
      },
    });

    return NextResponse.json({ success: true, trip: updated });
  } catch (error: any) {
    console.error("[HOME_COLLECTION_TRIP_PATCH]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST: Assign an existing appointment to this trip
// Body: { appointmentId, routeOrder? }
// ============================================================================
export async function POST(
  req: NextRequest,
  { params }: { params: { tripId: string } }
) {
  try {
    const user = await getDataFromToken(req);
    if (!user || !user.labId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { appointmentId, routeOrder } = body || {};

    if (!appointmentId) {
      return NextResponse.json(
        { error: "appointmentId is required" },
        { status: 400 }
      );
    }

    const trip = await prisma.homeCollectionTrip.findFirst({
      where: { id: params.tripId, labId: user.labId },
    });
    if (!trip) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }
    if (trip.status === "COMPLETED") {
      return NextResponse.json(
        { error: "Cannot assign appointments to a completed trip" },
        { status: 400 }
      );
    }

    const appointment = await prisma.appointment.findFirst({
      where: { id: appointmentId, labId: user.labId },
    });
    if (!appointment) {
      return NextResponse.json(
        { error: "Appointment not found" },
        { status: 404 }
      );
    }
    if (appointment.collectionMode !== "HOME_COLLECTION") {
      return NextResponse.json(
        { error: "Only home-collection appointments can be assigned to a trip" },
        { status: 400 }
      );
    }

    await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        trip: { connect: { id: params.tripId } },
        routeOrder: typeof routeOrder === "number" ? routeOrder : 0,
        status: "ASSIGNED",
      },
    });

    await prisma.activityLog.create({
      data: {
        labId: user.labId,
        userId: user.userId,
        action: "APPOINTMENT_ASSIGNED_TO_TRIP",
        entity: "Appointment",
        entityId: appointmentId,
        entityType: "APPOINTMENT",
        description: `Appointment ${appointmentId} assigned to trip ${params.tripId}`,
        details: JSON.stringify({
          tripId: params.tripId,
          appointmentId,
          at: nowIST().toISOString(),
        }),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[HOME_COLLECTION_TRIP_ASSIGN]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
