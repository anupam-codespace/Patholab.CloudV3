import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getDataFromToken } from '@/lib/auth'; // Your standard auth helper

// 1. GET: Fetch the Radiologist's Pending Queue
export async function GET(req: NextRequest) {
  try {
    const user = await getDataFromToken(req);
    if (!user || !user.labId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Fetch studies that are SCANNED (Ready for reporting) or REPORTING (Drafts)
    const pendingStudies = await prisma.radiologyStudy.findMany({
      where: {
        labId: user.labId,
        status: { in: ['SCANNED', 'REPORTING'] }
      },
      include: {
        patient: true,
        modality: true,
        report: true, // Include draft report if it exists
      },
      orderBy: { performedAt: 'asc' } // Oldest scans first
    });

    // Format data for the frontend
    const formattedQueue = pendingStudies.map(study => ({
      id: study.accessionNumber,
      studyId: study.id,
      studyUid: study.studyInstanceUid,
      patient: study.patient.name,
      ageSex: `${study.patient.age} ${study.patient.ageUnit.charAt(0)} / ${study.patient.gender.charAt(0)}`,
      scan: "Radiology Scan", // In production, map this from your order catalog
      modality: study.modality.type,
      time: study.performedAt ? new Date(study.performedAt).toLocaleString('en-IN') : 'Unknown',
      priority: 'ROUTINE', // Update if you add priority flags
      status: study.status === 'REPORTING' ? 'DRAFT' : 'UNREAD',
      clinicalNotes: study.report?.clinicalNotes || '',
      findings: study.report?.findings || '',
      impression: study.report?.impression || ''
    }));

    return NextResponse.json(formattedQueue);

  } catch (error) {
    console.error("Radiology Queue Fetch Error:", error);
    return NextResponse.json({ error: "Failed to fetch reporting queue" }, { status: 500 });
  }
}

// 2. POST: Save Draft or Finalize Report
export async function POST(req: NextRequest) {
  try {
    const user = await getDataFromToken(req);
    if (!user || !user.labId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { studyId, findings, impression, action } = body; // action = 'DRAFT' or 'FINALIZE'

    if (!studyId || !findings || !impression) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const reportStatus = action === 'FINALIZE' ? 'FINAL' : 'DRAFT';
    const studyStatus = action === 'FINALIZE' ? 'VERIFIED' : 'REPORTING';

    // ✅ THE FIX: Safely grab the user's ID regardless of how your token is structured
    const currentUserId = user.id || user.userId || user._id || 'SYSTEM_ADMIN';

    // Database Transaction to ensure both Report and Study update together
    await prisma.$transaction(async (tx) => {
      // 1. Upsert the Report
      await tx.radiologyReport.upsert({
        where: { studyId: studyId },
        update: {
          findings,
          impression,
          status: reportStatus,
          radiologistId: currentUserId, // ✅ Safely populated
          verifiedAt: action === 'FINALIZE' ? new Date() : null,
        },
        create: {
          studyId: studyId,
          findings,
          impression,
          status: reportStatus,
          radiologistId: currentUserId, // ✅ Safely populated
          verifiedAt: action === 'FINALIZE' ? new Date() : null,
        }
      });

      // 2. Update the Study Status
      await tx.radiologyStudy.update({
        where: { id: studyId },
        data: { status: studyStatus }
      });
    });

    return NextResponse.json({ success: true, message: `Report ${action.toLowerCase()}ed successfully.` });

  } catch (error) {
    console.error("Radiology Report Save Error:", error);
    return NextResponse.json({ error: "Failed to save report" }, { status: 500 });
  }
}