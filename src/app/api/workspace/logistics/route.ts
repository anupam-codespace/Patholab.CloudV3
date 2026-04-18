import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: Request) {
  try {
    // 1. Authenticate lab owner in production. 
    // For now, we fetch the first lab.
    const lab = await prisma.lab.findFirst();
    
    // THE FIX: If the database is empty, do not throw a 404 error.
    // Return empty arrays so the UI can render its "Empty State" gracefully.
    if (!lab) {
      return NextResponse.json({ fleet: [], tasks: [] });
    }

    // 2. Fetch the "Fleet" (Users assigned to this lab who can do collections)
    const fleetRecords = await prisma.labStaff.findMany({
      where: {
        labId: lab.id,
        isActive: true,
      },
      include: {
        user: {
          select: { id: true, name: true, phone: true, role: true }
        }
      }
    });

    // Transform DB staff into Fleet format for the UI
    const fleet = fleetRecords.map(staff => ({
      id: staff.user.id,
      name: staff.user.name,
      phone: staff.user.phone || "No Phone",
      status: "AVAILABLE",
      type: staff.position || staff.user.role,
      battery: "--", 
      task: null
    }));

    // 3. Fetch Pending Tasks (Home Collection Trips & Appointments)
    const trips = await prisma.homeCollectionTrip.findMany({
      where: {
        labId: lab.id,
        status: { in: ['SCHEDULED', 'IN_PROGRESS'] }
      },
      include: {
        phlebotomist: { select: { name: true } },
        appointments: {
          include: {
            patient: { select: { name: true, phone: true, address: true } }
          }
        }
      },
      orderBy: { scheduledDate: 'asc' }
    });

    // Transform DB trips into Task format for the UI
    const tasks = trips.flatMap(trip => 
      trip.appointments.map(appt => ({
        id: trip.id.slice(-6).toUpperCase(), // Short ID
        tripId: trip.id,
        type: "HOME_COLLECTION",
        client: appt.patient.name,
        address: appt.patient.address || trip.startLocation || "Address not provided",
        // Safe date parsing fallback
        timeWindow: trip.scheduledDate ? new Date(trip.scheduledDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : "TBD",
        status: trip.status,
        assignedTo: trip.phlebotomist?.name || "UNASSIGNED",
        requirements: ["Standard Protocol"] 
      }))
    );

    // 4. Return combined payload
    return NextResponse.json({ fleet, tasks });

  } catch (error) {
    console.error("[LOGISTICS_GET]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}