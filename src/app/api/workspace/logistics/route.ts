import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getDataFromToken } from '@/lib/auth';
import { nowIST, formatIST, formatTimeIST } from '@/lib/timezone';

export const dynamic = 'force-dynamic';

// ============================================================================
// GET: Fetch fleet (phlebotomists) + unassigned home-collection appointments
//      + existing trips for this lab
// ============================================================================
export async function GET(req: NextRequest) {
  try {
    const user = await getDataFromToken(req);
    if (!user || !user.labId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Fetch the fleet (staff users who can do home collections)
    const fleetRecords = await prisma.labStaff.findMany({
      where: {
        labId: user.labId,
        isActive: true,
        OR: [
          { position: { contains: 'PHLEBOTOMIST', mode: 'insensitive' } },
          { position: { contains: 'COLLECTION', mode: 'insensitive' } },
          { position: { contains: 'RIDER', mode: 'insensitive' } },
          { user: { role: 'PHLEBOTOMIST' } },
        ],
      },
      include: {
        user: {
          select: { id: true, name: true, phone: true, role: true },
        },
      },
    });

    // Also fetch any user with role=PHLEBOTOMIST for this lab (even if not in LabStaff)
    const phlebotomistUsers = await prisma.user.findMany({
      where: {
        role: 'PHLEBOTOMIST',
        staffLabs: { some: { labId: user.labId } },
      },
      select: { id: true, name: true, phone: true, role: true },
    });

    // Merge fleet records
    const fleetMap = new Map<string, any>();
    fleetRecords.forEach(s => {
      fleetMap.set(s.user.id, {
        id: s.user.id,
        name: s.user.name,
        phone: s.user.phone || '—',
        position: s.position || s.user.role,
        status: 'AVAILABLE',
      });
    });
    phlebotomistUsers.forEach(u => {
      if (!fleetMap.has(u.id)) {
        fleetMap.set(u.id, {
          id: u.id,
          name: u.name,
          phone: u.phone || '—',
          position: 'PHLEBOTOMIST',
          status: 'AVAILABLE',
        });
      }
    });

    // 2. Count active trips per phlebotomist to determine availability
    const fleet = Array.from(fleetMap.values());
    const fleetIds = fleet.map(f => f.id);
    const activeTripsByPhleb = await prisma.homeCollectionTrip.groupBy({
      by: ['phlebotomistId'],
      where: {
        phlebotomistId: { in: fleetIds },
        status: { in: ['SCHEDULED', 'STARTED', 'IN_PROGRESS'] },
      },
      _count: true,
    });
    const activeCountMap = new Map<string, number>(
      activeTripsByPhleb.map(t => [t.phlebotomistId, t._count])
    );
    fleet.forEach(f => {
      const count = activeCountMap.get(f.id) || 0;
      f.activeTrips = count;
      f.status = count > 0 ? 'BUSY' : 'AVAILABLE';
    });

    // 3. Fetch unassigned home-collection appointments (payment verified, no trip yet)
    const unassignedAppointments = await prisma.appointment.findMany({
      where: {
        labId: user.labId,
        collectionMode: 'HOME_COLLECTION',
        paymentVerified: true,
        tripId: null,
        status: { in: ['SCHEDULED', 'PENDING_PAYMENT', 'SAMPLE_COLLECTED'] },
      },
      include: {
        patient: {
          select: { id: true, name: true, phone: true, address: true, pincode: true },
        },
        tests: { select: { id: true, testName: true, testCode: true } },
        invoice: {
          select: { id: true, invoiceNumber: true, grandTotal: true, paymentStatus: true },
        },
      },
      orderBy: { appointmentDate: 'asc' },
    });

    const tasks = unassignedAppointments.map(a => ({
      id: a.id,
      type: 'HOME_COLLECTION',
      patient: a.patient?.name || 'Unknown',
      phone: a.patient?.phone || '—',
      address: a.patient?.address || '—',
      pincode: a.patient?.pincode || '—',
      trackId: a.trackId,
      timeSlot: a.timeSlot || '—',
      appointmentDate: formatIST(a.appointmentDate),
      appointmentTime: formatTimeIST(a.appointmentDate),
      testsCount: a.tests?.length || 0,
      testNames: a.tests?.map((t: any) => t.testName).join(', ') || '',
      invoice: a.invoice ? {
        invoiceNumber: a.invoice.invoiceNumber,
        grandTotal: Number(a.invoice.grandTotal),
        paymentStatus: a.invoice.paymentStatus,
      } : null,
      status: a.status,
    }));

    // 4. Fetch existing trips (assigned) for the dispatch list
    const trips = await prisma.homeCollectionTrip.findMany({
      where: {
        labId: user.labId,
        status: { in: ['SCHEDULED', 'STARTED', 'IN_PROGRESS'] },
      },
      include: {
        phlebotomist: { select: { id: true, name: true, phone: true } },
        appointments: {
          include: {
            patient: { select: { id: true, name: true, phone: true, address: true, pincode: true } },
            tests: { select: { id: true, testName: true } },
          },
          orderBy: { routeOrder: 'asc' },
        },
      },
      orderBy: { scheduledDate: 'asc' },
    });

    const serializedTrips = trips.map(t => ({
      id: t.id,
      phlebotomist: t.phlebotomist,
      scheduledDate: formatIST(t.scheduledDate),
      scheduledTime: formatTimeIST(t.scheduledDate),
      status: t.status,
      startedAt: t.startedAt ? formatIST(t.startedAt) : null,
      stopsCount: t.appointments.length,
      appointments: t.appointments.map(a => ({
        id: a.id,
        patient: a.patient?.name,
        phone: a.patient?.phone,
        address: a.patient?.address,
        pincode: a.patient?.pincode,
        testsCount: a.tests?.length || 0,
      })),
    }));

    return NextResponse.json({
      fleet,
      tasks,
      trips: serializedTrips,
      stats: {
        totalFleet: fleet.length,
        availableFleet: fleet.filter(f => f.status === 'AVAILABLE').length,
        unassignedTasks: tasks.length,
        activeTrips: trips.length,
      },
    });
  } catch (error: any) {
    console.error('[LOGISTICS_GET]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// ============================================================================
// POST: Create a new trip with assigned phlebotomist + appointments
// Body: { phlebotomistId, appointmentIds, scheduledDate, startLocation? }
// ============================================================================
export async function POST(req: NextRequest) {
  try {
    const user = await getDataFromToken(req);
    if (!user || !user.labId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { phlebotomistId, appointmentIds, scheduledDate, startLocation } = body || {};

    if (!phlebotomistId || !appointmentIds || !Array.isArray(appointmentIds) || appointmentIds.length === 0) {
      return NextResponse.json(
        { error: 'phlebotomistId and appointmentIds[] are required' },
        { status: 400 }
      );
    }

    // Verify phlebotomist belongs to this lab
    const phlebStaff = await prisma.labStaff.findFirst({
      where: { labId: user.labId, userId: phlebotomistId, isActive: true },
    });
    const phlebUser = phlebStaff
      ? null
      : await prisma.user.findFirst({
          where: {
            id: phlebotomistId,
            role: 'PHLEBOTOMIST',
            staffLabs: { some: { labId: user.labId } },
          },
        });

    if (!phlebStaff && !phlebUser) {
      return NextResponse.json(
        { error: 'Phlebotomist not found in your lab' },
        { status: 404 }
      );
    }

    // Use the appointment's first date as the scheduled date fallback
    let tripDate: Date;
    if (scheduledDate) {
      tripDate = new Date(scheduledDate);
      if (isNaN(tripDate.getTime())) {
        return NextResponse.json({ error: 'Invalid scheduledDate' }, { status: 400 });
      }
    } else {
      const firstAppt = await prisma.appointment.findFirst({
        where: { id: { in: appointmentIds }, labId: user.labId },
        orderBy: { appointmentDate: 'asc' },
      });
      tripDate = firstAppt?.appointmentDate || nowIST();
    }

    // Create the trip
    const trip = await prisma.homeCollectionTrip.create({
      data: {
        labId: user.labId,
        phlebotomistId,
        scheduledDate: tripDate,
        startLocation: startLocation || null,
      },
    });

    // Assign appointments to the trip with sequential route order
    await Promise.all(
      appointmentIds.map((apptId: string, idx: number) =>
        prisma.appointment.update({
          where: { id: apptId },
          data: { tripId: trip.id, routeOrder: idx },
        })
      )
    );

    // Log activity
    await prisma.activityLog.create({
      data: {
        labId: user.labId,
        userId: user.id || user.userId,
        action: 'TRIP_CREATED',
        entity: 'TRIP',
        entityType: 'TRIP',
        entityId: trip.id,
        description: `Created trip with ${appointmentIds.length} stops for phlebotomist ${phlebStaff?.user?.name || phlebUser?.name || 'Unknown'}`,
      },
    }).catch(() => {/* non-fatal */});

    return NextResponse.json({ success: true, tripId: trip.id });
  } catch (error: any) {
    console.error('[LOGISTICS_POST]', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}
