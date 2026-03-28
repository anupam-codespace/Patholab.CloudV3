import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getDataFromToken } from '@/lib/auth';
import { startOfDay, endOfDay } from 'date-fns';

// 1. GET: Fetch today's active worklist for technicians
export async function GET(req: NextRequest) {
  try {
    const user = await getDataFromToken(req);
    if (!user || !user.labId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());

    // Fetch appointments that are relevant for the technician today
    // We exclude COMPLETED and CANCELLED so they disappear from the queue once done.
    const activeQueue = await prisma.radiologyAppointment.findMany({
      where: {
        labId: user.labId,
        scheduledStart: { gte: todayStart, lte: todayEnd },
        status: { in: ['SCHEDULED', 'ARRIVED', 'IN_PROGRESS'] }
      },
      include: {
        patient: { select: { id: true, name: true, age: true, ageUnit: true, gender: true } },
        modality: { select: { id: true, name: true, type: true } },
        study: { select: { id: true, accessionNumber: true, safetyChecklist: true } }
      },
      orderBy: { scheduledStart: 'asc' }
    });

    return NextResponse.json(activeQueue);

  } catch (error) {
    console.error("Worklist GET Error:", error);
    return NextResponse.json({ error: "Failed to fetch technician worklist" }, { status: 500 });
  }
}

// 2. PATCH: Update Scan Status & Save Safety Checklist
export async function PATCH(req: NextRequest) {
  try {
    const user = await getDataFromToken(req);
    if (!user || !user.labId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { appointmentId, studyId, action, safetyChecklist } = body; 

    if (!appointmentId || !studyId || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // ACTION: Tech clicks "Start Scan"
    if (action === 'START') {
      await prisma.$transaction([
        // 1. Mark Appointment as In Progress
        prisma.radiologyAppointment.update({
          where: { id: appointmentId, labId: user.labId },
          data: { status: 'IN_PROGRESS' }
        }),
        // 2. Save the mandatory safety checklist to the clinical study record
        prisma.radiologyStudy.update({
          where: { id: studyId, labId: user.labId },
          data: { safetyChecklist: safetyChecklist }
        })
      ]);
      return NextResponse.json({ success: true, message: 'Scan started and safety verified.' });
    }

    // ACTION: Tech clicks "Mark Completed"
    if (action === 'COMPLETE') {
      await prisma.$transaction([
        // 1. Mark Appointment as Completed (removes from tech queue)
        prisma.radiologyAppointment.update({
          where: { id: appointmentId, labId: user.labId },
          data: { status: 'COMPLETED' }
        }),
        // 2. Mark Study as SCANNED (pushes it to the Radiologist's reporting queue)
        prisma.radiologyStudy.update({
          where: { id: studyId, labId: user.labId },
          data: { 
            status: 'SCANNED',
            performedAt: new Date() // Records exact time the scan finished
          }
        })
      ]);
      return NextResponse.json({ success: true, message: 'Scan completed. Pushed to Radiologist queue.' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error("Worklist PATCH Error:", error);
    return NextResponse.json({ error: "Failed to process scan update" }, { status: 500 });
  }
}