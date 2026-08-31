import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDataFromToken } from "@/lib/auth";
import { nowIST } from "@/lib/timezone";

export const dynamic = "force-dynamic";

// ============================================================================
// PATCH: Update trip status (START / IN_PROGRESS / COMPLETE)
// Body: { status, startLocation?, endLocation?, totalDistance?, notes? }
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
    const { status, startLocation, endLocation, totalDistance, notes } = body || {};

    const validStatuses = ["SCHEDULED", "STARTED", "IN_PROGRESS", "COMPLETED"];
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `status must be one of: ${validStatuses.join(", ")}` },
        { status: 400 }
      );
    }

    // Fetch the trip and verify ownership (phlebotomist can only update their own trips)
    const trip = await prisma.homeCollectionTrip.findFirst({
      where: { id: params.tripId, labId: user.labId },
    });

    if (!trip) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    if (user.role === "PHLEBOTOMIST" && trip.phlebotomistId !== user.userId) {
      return NextResponse.json(
        { error: "You can only update trips assigned to you" },
        { status: 403 }
      );
    }

    const patch: any = { status };
    if (startLocation !== undefined) patch.startLocation = startLocation || null;
    if (endLocation !== undefined) patch.endLocation = endLocation || null;
    if (totalDistance !== undefined) patch.totalDistance = Number(totalDistance) || null;
    if (notes !== undefined) patch.notes = notes || null;

    // Set timestamp fields based on status transition
    if (status === "STARTED" && !trip.startedAt) {
      patch.startedAt = nowIST();
    }
    if (status === "COMPLETED" && !trip.completedAt) {
      patch.completedAt = nowIST();
    }

    const updated = await prisma.homeCollectionTrip.update({
      where: { id: params.tripId },
      data: patch,
      include: {
        phlebotomist: { select: { id: true, name: true, phone: true } },
        appointments: {
          include: {
            patient: { select: { id: true, name: true, phone: true, address: true } },
            tests: { select: { id: true, testName: true, testCode: true, status: true } },
          },
        },
      },
    });

    // If trip is completed, mark all appointments in the trip as "SAMPLE_COLLECTED"
    if (status === "COMPLETED") {
      await prisma.appointment.updateMany({
        where: { tripId: params.tripId },
        data: { status: "SAMPLE_COLLECTED" },
      });

      // Also create Sample records for each test in the appointments
      const appts = await prisma.appointment.findMany({
        where: { tripId: params.tripId },
        include: { tests: true, patient: true },
      });

      for (const appt of appts) {
        for (const test of appt.tests) {
          // Check if sample already exists for this test
          const existing = await prisma.sample.findFirst({
            where: { tests: { some: { id: test.id } } },
          });
          if (!existing) {
            const sampleCount = await prisma.sample.count({ where: { labId: user.labId } });
            await prisma.sample.create({
              data: {
                labId: user.labId,
                branchId: appt.branchId,
                sampleId: `S-${String(sampleCount + 1).padStart(5, '0')}`,
                patientId: appt.patientId,
                status: "COLLECTED",
                collectedAt: nowIST(),
                tests: { connect: { id: test.id } },
              },
            });
          }
        }

        // Mark the test as ready for processing
        await prisma.test.updateMany({
          where: { appointmentId: appt.id },
          data: { status: "IN_PROGRESS" },
        });
      }
    }

    return NextResponse.json({ success: true, trip: updated });
  } catch (error: any) {
    console.error("[COLLECTION_STAFF_TRIP_UPDATE]", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}

// ============================================================================
// GET: Single trip detail
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
        phlebotomist: { select: { id: true, name: true, phone: true } },
        appointments: {
          include: {
            patient: { select: { id: true, name: true, phone: true, address: true, pincode: true } },
            tests: { select: { id: true, testName: true, testCode: true, status: true } },
            invoice: { select: { id: true, invoiceNumber: true, grandTotal: true, paymentStatus: true } },
          },
          orderBy: { routeOrder: "asc" },
        },
      },
    });

    if (!trip) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    if (user.role === "PHLEBOTOMIST" && trip.phlebotomistId !== user.userId) {
      return NextResponse.json(
        { error: "You can only view trips assigned to you" },
        { status: 403 }
      );
    }

    return NextResponse.json({ trip });
  } catch (error: any) {
    console.error("[COLLECTION_STAFF_TRIP_GET]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
