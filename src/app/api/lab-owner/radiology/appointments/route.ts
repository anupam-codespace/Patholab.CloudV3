import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getDataFromToken } from '@/lib/auth';
import { startOfDay, endOfDay, parseISO } from 'date-fns';

// 1. GET: Fetch Schedule, Modalities, and Patients
export async function GET(req: NextRequest) {
  try {
    const user = await getDataFromToken(req);
    if (!user || !user.labId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const url = new URL(req.url);
    const dateParam = url.searchParams.get('date');
    const targetDate = dateParam ? parseISO(dateParam) : new Date();

    const start = startOfDay(targetDate);
    const end = endOfDay(targetDate);

    // Fetch Appointments for the selected date
    const appointments = await prisma.radiologyAppointment.findMany({
      where: {
        labId: user.labId,
        scheduledStart: { gte: start, lte: end }
      },
      include: {
        patient: { select: { id: true, name: true, phone: true } },
        modality: { select: { name: true, type: true } },
        study: { select: { accessionNumber: true } }
      },
      orderBy: { scheduledStart: 'asc' }
    });

    // Fetch Modalities for the booking dropdown
    const modalities = await prisma.modality.findMany({
      where: { labId: user.labId, status: 'ACTIVE' },
      select: { id: true, name: true, type: true }
    });

    // Fetch Patients for the booking dropdown (In a massive prod app, use a dedicated search API)
    const patients = await prisma.patient.findMany({
      where: { labId: user.labId },
      select: { id: true, name: true, phone: true },
      take: 100 
    });

    return NextResponse.json({ appointments, modalities, patients });

  } catch (error) {
    console.error("Appointments GET Error:", error);
    return NextResponse.json({ error: "Failed to fetch schedule" }, { status: 500 });
  }
}

// 2. POST: Book a New Appointment & Create the Study
export async function POST(req: NextRequest) {
  try {
    const user = await getDataFromToken(req);
    if (!user || !user.labId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { patientId, modalityId, scanName, scheduledStart, scheduledEnd, notes } = body;

    if (!patientId || !modalityId || !scanName || !scheduledStart) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Run in a Transaction: If one fails, both fail.
    const result = await prisma.$transaction(async (tx) => {
      
      // A. Create the Calendar Appointment
      const appointment = await tx.radiologyAppointment.create({
        data: {
          labId: user.labId,
          patientId,
          modalityId,
          scanName,
          notes,
          scheduledStart: new Date(scheduledStart),
          scheduledEnd: new Date(scheduledEnd || scheduledStart), // Fallback if end not provided
          status: 'SCHEDULED'
        }
      });

      // B. Create the Clinical Study Record (Generates Accession Number for PACS)
      const accessionNumber = `ACC-${Date.now().toString().slice(-6)}`; // E.g., ACC-849201
      
      const study = await tx.radiologyStudy.create({
        data: {
          labId: user.labId,
          patientId,
          appointmentId: appointment.id,
          modalityId,
          scanName,
          accessionNumber,
          status: 'ORDERED'
        }
      });

      return { appointment, study };
    });

    return NextResponse.json({ success: true, data: result, message: 'Appointment booked successfully' });

  } catch (error) {
    console.error("Appointment POST Error:", error);
    return NextResponse.json({ error: "Failed to book appointment" }, { status: 500 });
  }
}

// 3. PATCH: Update Status (Check-in, Start Scan, Complete)
export async function PATCH(req: NextRequest) {
  try {
    const user = await getDataFromToken(req);
    if (!user || !user.labId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { appointmentId, status } = body; // status: 'ARRIVED', 'IN_PROGRESS', 'COMPLETED'

    // Update Appointment Status
    const appointment = await prisma.radiologyAppointment.update({
      where: { id: appointmentId },
      data: { status }
    });

    // Automatically sync the Study Status with the Appointment Status
    let studyStatus = 'ORDERED';
    if (status === 'IN_PROGRESS') studyStatus = 'SCANNED'; // Tech starts scanning
    if (status === 'COMPLETED') studyStatus = 'REPORTING'; // Sent to doctor's queue

    if (status === 'IN_PROGRESS' || status === 'COMPLETED') {
       await prisma.radiologyStudy.update({
         where: { appointmentId },
         data: { status: studyStatus }
       });
    }

    return NextResponse.json({ success: true, message: `Status updated to ${status}` });

  } catch (error) {
    console.error("Appointment PATCH Error:", error);
    return NextResponse.json({ error: "Failed to update status" }, { status: 500 });
  }
}