import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// ==========================================
// GET: Fetch Active Tasks for Logged-In Phlebotomist
// ==========================================
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.labId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "PHLEBOTOMIST") return NextResponse.json({ error: "Phlebotomist access required." }, { status: 403 });

    // 1. Find the LabStaff profile for the logged-in User
    const staffProfile = await prisma.labStaff.findFirst({
      where: { userId: user.id, labId: user.labId }
    });

    if (!staffProfile) {
      return NextResponse.json({ error: "No staff profile found." }, { status: 404 });
    }

    // 2. Fetch Appointments linked to Trips assigned to this specific Phlebotomist
   // Update the status filter in the GET function:
const tasks = await prisma.appointment.findMany({
  where: {
    labId: user.labId,
    trip: {
      phlebotomistId: user.id
    },
    // 🚀 FIX: Remove tasks once the sample is collected or received by the lab
    status: { 
      notIn: [
        "COMPLETED", 
        "CANCELLED", 
        "SAMPLE_COLLECTED", 
        "RECEIVED_AT_LAB", 
        "RESULT_ENTERED"
      ] 
    }
  },
  include: {
    patient: { select: { name: true, phone: true } },
    trip: { select: { id: true, status: true } }
  },
  orderBy: { timeSlot: 'asc' }
});

    return NextResponse.json({ success: true, tasks });

  } catch (error) {
    console.error("Field Tasks Error:", error);
    return NextResponse.json({ error: "Failed to fetch tasks" }, { status: 500 });
  }
}

// ==========================================
// PATCH: Update Physical Status (En Route, Arrived, etc)
// ==========================================
export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.labId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "PHLEBOTOMIST") return NextResponse.json({ error: "Phlebotomist access required." }, { status: 403 });

    const { appointmentId, newStatus, note } = await req.json();

    if (!appointmentId || !newStatus) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    const allowedNextStatus: Record<string, string> = { ASSIGNED: "EN_ROUTE", EN_ROUTE: "ARRIVED", ARRIVED: "SAMPLE_COLLECTED" };
    const appointment = await prisma.appointment.findFirst({
      where: { id: appointmentId, labId: user.labId, trip: { phlebotomistId: user.id } },
      select: { id: true, status: true, tripId: true }, // ✅ FIX: tripId is needed for trip status advancement
    });
    if (!appointment) return NextResponse.json({ error: "Task not found." }, { status: 404 });
    if (allowedNextStatus[appointment.status] !== newStatus) {
      return NextResponse.json({ error: "Invalid status transition." }, { status: 409 });
    }

    // Update the Appointment Status
    const updated = await prisma.appointment.update({
      where: { id: appointment.id },
      data: { status: newStatus }
    });

    // 🚀 Logic to advance the Trip Status
if (appointment.tripId) {
  if (newStatus === "EN_ROUTE") {
    // First action -> Trip has officially started
    await prisma.homeCollectionTrip.update({
      where: { id: appointment.tripId },
      data: { status: "STARTED" }
    });
  } else if (newStatus === "SAMPLE_COLLECTED") {
    // Check if this was the last pending task on this trip
    const remainingTasks = await prisma.appointment.count({
      where: {
        tripId: appointment.tripId,
        status: { notIn: ["SAMPLE_COLLECTED", "RECEIVED_AT_LAB", "COMPLETED", "CANCELLED"] }
      }
    });

    if (remainingTasks === 0) {
      // All samples collected -> Trip is now in progress back to lab
      await prisma.homeCollectionTrip.update({
        where: { id: appointment.tripId },
        data: { status: "IN_PROGRESS" }
      });
    }
  }
}

    // Log the physical movement in ActivityLog for the admin to see
    await prisma.activityLog.create({
      data: {
        labId: user.labId,
        userId: user.id!,
        action: `MARKED_${newStatus}`,
        entity: "APPOINTMENT",
        entityId: appointmentId,
        entityType: "APPOINTMENT",
        description: `Phlebotomist marked status as ${newStatus.replace("_", " ")}. ${note ? 'Note: ' + note : ''}`
      }
    });

    return NextResponse.json({ success: true, message: `Status updated to ${newStatus}`, updated });

  } catch (error) {
    console.error("Status Update Error:", error);
    return NextResponse.json({ error: "Failed to update status" }, { status: 500 });
  }
}
