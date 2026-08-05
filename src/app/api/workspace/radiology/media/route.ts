import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getDataFromToken } from '@/lib/auth';
import { subDays } from 'date-fns';

// 1. GET: Fetch the dispatch queue (Recent completed/scanned studies)
export async function GET(req: NextRequest) {
  try {
    const user = await getDataFromToken(req);
    if (!user || !user.labId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Fetch studies from the last 7 days that are done scanning
    const recentDate = subDays(new Date(), 7);

    const studies = await prisma.radiologyStudy.findMany({
      where: {
        labId: user.labId,
        performedAt: { gte: recentDate },
        status: { in: ['SCANNED', 'REPORTING', 'VERIFIED'] }
      },
      include: {
        patient: { select: { id: true, name: true, phone: true } },
        modality: { select: { type: true } },
      },
      orderBy: { performedAt: 'desc' }
    });

    // Format data and ensure mediaStatus has a default structure
    const dispatchQueue = studies.map(study => {
      const defaultMediaStatus = {
        film: 'PENDING', // PENDING, PRINTED, N/A
        cd: 'PENDING',   // PENDING, BURNED, N/A
        digital: 'PENDING', // PENDING, SENT
        overallStatus: 'PROCESSING' // PROCESSING, READY, DISPATCHED
      };

      // Merge DB JSON with default structure
      const currentMediaStatus = study.mediaStatus 
        ? { ...defaultMediaStatus, ...(study.mediaStatus as object) } 
        : defaultMediaStatus;

      return {
        id: study.accessionNumber,
        studyId: study.id,
        patientName: study.patient.name,
        patientPhone: study.patient.phone,
        scanName: study.scanName,
        modality: study.modality.type,
        time: study.performedAt ? new Date(study.performedAt).toLocaleString('en-IN') : 'N/A',
        mediaStatus: currentMediaStatus,
        // Clinical status (Is the report actually ready?)
        clinicalStatus: study.status 
      };
    });

    return NextResponse.json(dispatchQueue);

  } catch (error) {
    console.error("Media GET Error:", error);
    return NextResponse.json({ error: "Failed to fetch dispatch queue" }, { status: 500 });
  }
}

// 2. PATCH: Update specific media status (Print Film, Burn CD, Dispatch)
export async function PATCH(req: NextRequest) {
  try {
    const user = await getDataFromToken(req);
    if (!user || !user.labId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { studyId, mediaType, newStatus, currentMediaStatus } = body; 
    // mediaType can be 'film', 'cd', 'digital', or 'overallStatus'

    if (!studyId || !mediaType || !newStatus) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Prepare the updated JSON object
    const updatedMediaStatus = {
      ...currentMediaStatus,
      [mediaType]: newStatus
    };

    // Auto-calculate 'READY' status if Film and CD are done
    if (mediaType !== 'overallStatus' && updatedMediaStatus.overallStatus === 'PROCESSING') {
      const isFilmReady = updatedMediaStatus.film === 'PRINTED' || updatedMediaStatus.film === 'N/A';
      const isCdReady = updatedMediaStatus.cd === 'BURNED' || updatedMediaStatus.cd === 'N/A';
      
      if (isFilmReady && isCdReady) {
        updatedMediaStatus.overallStatus = 'READY';
      }
    }

    // Save back to DB
    await prisma.radiologyStudy.update({
      where: { id: studyId, labId: user.labId },
      data: { mediaStatus: updatedMediaStatus }
    });

    return NextResponse.json({ 
      success: true, 
      message: `Status updated successfully`, 
      newStatus: updatedMediaStatus 
    });

  } catch (error) {
    console.error("Media PATCH Error:", error);
    return NextResponse.json({ error: "Failed to update media status" }, { status: 500 });
  }
}