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
    const formattedQueue = pendingStudies.map((study) => ({
  id: study.accessionNumber,
  studyId: study.id,
  studyUid: study.studyInstanceUid,

  // Required for patient-context API
  patientId: study.patientId,

  // Patient info
  patient: study.patient?.name ?? "Unknown Patient",

  age: study.patient?.age
    ? `${study.patient.age} ${
        study.patient.ageUnit
          ? study.patient.ageUnit.charAt(0)
          : ""
      }`
    : "N/A",

  gender: study.patient?.gender ?? "N/A",

  // Your Patient table has patientId, not uhid
  uhid: study.patient?.patientId ?? "N/A",

  // Study info
  scan: study.scanName ?? "Radiology Scan",

  modality:
    study.modality?.type ??
    study.modality?.name ??
    "N/A",

  referringDoctor:
    study.referringDoctor ?? "N/A",

  complaint:
    study.clinicalHistory ?? "No clinical history",

  time: study.performedAt
    ? new Date(study.performedAt).toLocaleString("en-IN")
    : "Unknown",

  priority: study.priority ?? "ROUTINE",

  status:
    study.status === "REPORTING"
      ? "DRAFT"
      : "UNREAD",

  clinicalNotes:
    study.report?.clinicalNotes ?? "",

  findings:
    study.report?.findings ?? "",

  impression:
    study.report?.impression ?? "",
}));

    return NextResponse.json(formattedQueue);

  } catch (error) {
    console.error("Radiology Queue Fetch Error:", error);
    return NextResponse.json({ error: "Failed to fetch reporting queue" }, { status: 500 });
  }
}

/// 2. POST: Save Draft or Finalize Report
export async function POST(req: NextRequest) {
  try {
    const user = await getDataFromToken(req);
    // STABLE AUTH CHECK: Ensure we absolutely have a user ID and Lab ID
    const currentUserId = user?.id || user?.userId || user?._id;
    if (!user || !user.labId || !currentUserId) {
      return NextResponse.json({ error: 'Unauthorized or missing User ID' }, { status: 401 });
    }

    const body = await req.json();
    const { studyId, findings, impression, action } = body; 

    if (!studyId || !findings || !impression) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // SECURITY CHECK: Verify the study actually belongs to this Lab before modifying it
    const existingStudy = await prisma.radiologyStudy.findFirst({
      where: { id: studyId, labId: user.labId }
    });

    if (!existingStudy) {
      return NextResponse.json({ error: 'Study not found or unauthorized access' }, { status: 403 });
    }

    const reportStatus = action === 'FINALIZE' ? 'FINAL' : 'DRAFT';
    const studyStatus = action === 'FINALIZE' ? 'VERIFIED' : 'REPORTING';

    // Database Transaction to ensure both Report and Study update together
    await prisma.$transaction(async (tx) => {
      // 1. Upsert the Report (Ensure your schema has @unique on studyId in RadiologyReport)
      await tx.radiologyReport.upsert({
        where: { studyId: studyId },
        update: {
          findings,
          impression,
          status: reportStatus,
          radiologistId: currentUserId,
          verifiedAt: action === 'FINALIZE' ? new Date() : null,
        },
        create: {
          labId: user.labId, // ✅ Added missing labId
          studyId: studyId,
          findings,
          impression,
          status: reportStatus,
          radiologistId: currentUserId, 
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