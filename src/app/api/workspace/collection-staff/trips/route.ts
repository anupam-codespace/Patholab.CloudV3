import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDataFromToken } from "@/lib/auth";
import { formatIST, formatTimeIST } from "@/lib/timezone";

export const dynamic = "force-dynamic";

// ============================================================================
// GET: Fetch trips assigned to the logged-in phlebotomist
// ============================================================================
export async function GET(req: NextRequest) {
  try {
    const user = await getDataFromToken(req);
    if (!user || !user.labId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.role !== "PHLEBOTOMIST" && user.role !== "LAB_OWNER" && user.role !== "SUPER_ADMIN" && user.role !== "LAB_MANAGER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const filter = searchParams.get("filter") || "today"; // today | upcoming | completed | all

    const now = new Date();
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const where: any = {
      labId: user.labId,
      // PHLEBOTOMIST sees only their own trips; OWNER/MANAGER sees all
      ...(user.role === "PHLEBOTOMIST" ? { phlebotomistId: user.userId } : {}),
    };

    if (filter === "today") {
      where.scheduledDate = { gte: startOfToday, lte: endOfToday };
      where.status = { in: ["SCHEDULED", "STARTED", "IN_PROGRESS"] };
    } else if (filter === "upcoming") {
      where.scheduledDate = { gt: endOfToday };
      where.status = { in: ["SCHEDULED", "STARTED", "IN_PROGRESS"] };
    } else if (filter === "completed") {
      where.status = "COMPLETED";
    }

    const trips = await prisma.homeCollectionTrip.findMany({
      where,
      orderBy: { scheduledDate: "asc" },
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

    // Compute summary stats
    const allTrips = await prisma.homeCollectionTrip.findMany({
      where: {
        labId: user.labId,
        ...(user.role === "PHLEBOTOMIST" ? { phlebotomistId: user.userId } : {}),
      },
      select: { id: true, status: true, scheduledDate: true },
    });

    const stats = {
      totalToday: allTrips.filter(t =>
        t.scheduledDate >= startOfToday &&
        t.scheduledDate <= endOfToday &&
        t.status !== "COMPLETED"
      ).length,
      totalCompleted: allTrips.filter(t => t.status === "COMPLETED").length,
      totalPending: allTrips.filter(t => t.status === "SCHEDULED").length,
      totalInProgress: allTrips.filter(t => t.status === "STARTED" || t.status === "IN_PROGRESS").length,
    };

    // Serialize dates
    const serializedTrips = trips.map(trip => ({
      ...trip,
      scheduledDate: formatIST(trip.scheduledDate),
      scheduledTime: formatTimeIST(trip.scheduledDate),
      startedAt: trip.startedAt ? formatIST(trip.startedAt) : null,
      completedAt: trip.completedAt ? formatIST(trip.completedAt) : null,
      appointments: trip.appointments.map(a => ({
        ...a,
        appointmentDate: formatIST(a.appointmentDate),
        invoice: a.invoice ? { ...a.invoice, grandTotal: Number(a.invoice.grandTotal) } : null,
      })),
    }));

    return NextResponse.json({ trips: serializedTrips, stats });
  } catch (error: any) {
    console.error("[COLLECTION_STAFF_TRIPS_GET]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
