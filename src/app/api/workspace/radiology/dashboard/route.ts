import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getDataFromToken } from '@/lib/auth';
import { startOfDay, endOfDay, differenceInMinutes, format } from 'date-fns';

export async function GET(req: NextRequest) {
  try {
    const tokenData = await getDataFromToken(req);
    
    // 1. Resilient Auth Check
    const userId = tokenData?.id || tokenData?.userId || tokenData?._id;

    if (!tokenData || !userId) {
       return NextResponse.json({ error: 'Unauthorized: No valid session found.' }, { status: 401 });
    }

    // 2. Safely Resolve Lab ID
    let currentLabId = tokenData.labId;

    if (!currentLabId) {
       const userRecord = await prisma.user.findUnique({
          where: { id: userId },
          select: { lab: { select: { id: true } } }
       });

       if (!userRecord || !userRecord.lab) {
           return NextResponse.json({ error: 'Forbidden: User is not associated with a lab.' }, { status: 403 });
       }
       currentLabId = userRecord.lab.id;
    }

    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());

    // ==========================================
    // 1. STATS CALCULATION
    // ==========================================
    
    const scansTodayCount = await prisma.radiologyStudy.count({
      where: { labId: currentLabId, createdAt: { gte: todayStart, lte: todayEnd } }
    });

    const pendingReportsCount = await prisma.radiologyStudy.count({
      where: { labId: currentLabId, status: { in: ['SCANNED', 'REPORTING'] } }
    });

    const completedToday = await prisma.radiologyStudy.findMany({
      where: {
        labId: currentLabId,
        status: 'VERIFIED',
        report: { verifiedAt: { gte: todayStart, lte: todayEnd } }
      },
      include: { report: true }
    });

    let avgTatStr = "0h 0m";
    if (completedToday.length > 0) {
      const totalMinutes = completedToday.reduce((sum, study) => {
        if (study.performedAt && study.report?.verifiedAt) {
          return sum + differenceInMinutes(new Date(study.report.verifiedAt), new Date(study.performedAt));
        }
        return sum;
      }, 0);
      const avgMins = Math.round(totalMinutes / completedToday.length);
      avgTatStr = `${Math.floor(avgMins / 60)}h ${avgMins % 60}m`;
    }

    const revenueAgg = await prisma.invoice.aggregate({
      _sum: { grandTotal: true },
      where: { 
        labId: currentLabId,
        status: 'PAID',
        createdAt: { gte: todayStart, lte: todayEnd },
      }
    });
    
    const revenueToday = Number(revenueAgg._sum.grandTotal || 0);

    // ==========================================
    // 2. MODALITIES STATUS (Machines)
    // ==========================================
    const modalitiesList = await prisma.modality.findMany({
      where: { labId: currentLabId }
    });

    const modalitiesData = await Promise.all(modalitiesList.map(async (mod) => {
      const currentStudy = await prisma.radiologyStudy.findFirst({
        where: { modalityId: mod.id, status: 'IN_PROGRESS' },
        include: { patient: { select: { name: true } } }
      });

      const nextApt = await prisma.radiologyAppointment.findFirst({
        where: { 
          modalityId: mod.id, 
          status: 'SCHEDULED',
          scheduledStart: { gte: new Date() }
        },
        orderBy: { scheduledStart: 'asc' },
        include: { patient: { select: { name: true } } }
      });

      const aptsToday = await prisma.radiologyAppointment.count({
        where: { modalityId: mod.id, scheduledStart: { gte: todayStart, lte: todayEnd } }
      });
      const loadPercent = Math.min(Math.round((aptsToday / 20) * 100), 100);

      return {
        id: mod.id,
        name: mod.name,
        type: mod.type,
        status: mod.status,
        currentPatient: currentStudy ? currentStudy.patient.name : '-',
        nextSlot: nextApt ? format(new Date(nextApt.scheduledStart), 'hh:mm a') : 'No upcoming slots',
        load: loadPercent
      };
    })); // <-- MAP IS NOW PROPERLY CLOSED HERE

    // ==========================================
    // 3. PENDING QUEUE (For Radiologists)
    // ==========================================
    const pendingQueueRaw = await prisma.radiologyStudy.findMany({
      where: { labId: currentLabId, status: { in: ['SCANNED', 'REPORTING'] } },
      include: {
        patient: { select: { name: true } },
        modality: { select: { type: true } }
      },
      orderBy: { performedAt: 'asc' },
      take: 6
    });

    const pendingQueue = pendingQueueRaw.map(study => ({
      id: study.accessionNumber,
      patient: study.patient.name,
      scan: `${study.modality.type} Scan`, 
      time: study.performedAt ? format(new Date(study.performedAt), 'hh:mm a') : 'Unknown',
      priority: 'NORMAL' 
    }));

    // ==========================================
    // 4. LIVE WORKFLOW COUNTS (The Pipeline)
    // ==========================================
    const workflowCounts = await prisma.radiologyStudy.groupBy({
      by: ['status'],
      where: { 
        labId: currentLabId,
        createdAt: { gte: todayStart, lte: todayEnd } 
      },
      _count: true
    });

    const workflow = {
      scheduled: 0, waiting: 0, scanning: 0, reporting: 0, verified: 0, delivered: 0
    };

    workflowCounts.forEach(item => {
      if (item.status === 'SCHEDULED' || item.status === 'ORDERED') workflow.scheduled = item._count;
      if (item.status === 'ARRIVED') workflow.waiting = item._count;
      if (item.status === 'IN_PROGRESS') workflow.scanning = item._count;
      if (item.status === 'SCANNED' || item.status === 'REPORTING') workflow.reporting += item._count;
      if (item.status === 'VERIFIED') workflow.verified = item._count;
      if (item.status === 'DELIVERED') workflow.delivered = item._count;
    });

    // ==========================================
    // FINAL AGGREGATED RESPONSE
    // ==========================================
    return NextResponse.json({
      stats: {
        scansToday: scansTodayCount,
        pendingReports: pendingReportsCount,
        avgTat: avgTatStr,
        revenueToday: `₹${revenueToday.toLocaleString()}`
      },
      workflow: workflow, // Triggers the pipeline UI
      modalities: modalitiesData,
      pendingQueue: pendingQueue
    });

  } catch (error) {
    console.error("Radiology Dashboard Error:", error);
    return NextResponse.json({ error: "Failed to fetch dashboard data" }, { status: 500 });
  }
}