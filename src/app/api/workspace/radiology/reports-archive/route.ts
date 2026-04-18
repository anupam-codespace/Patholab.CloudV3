import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getDataFromToken } from '@/lib/auth';

// --- AUTHENTICATION HELPER ---
async function getValidatedLabId(req: NextRequest) {
  const tokenData = await getDataFromToken(req);
  
  // Resilient Auth Check (Catches id, userId, or _id)
  const userId = tokenData?.id || tokenData?.userId || tokenData?._id;

  if (!tokenData || !userId) {
     throw new Error("UNAUTHORIZED");
  }

  let currentLabId = tokenData.labId;

  // If labId isn't directly on the token, fetch it securely from the DB
  if (!currentLabId) {
     const userRecord = await prisma.user.findUnique({
        where: { id: userId },
        select: { lab: { select: { id: true } } }
     });

     if (!userRecord || !userRecord.lab) {
         throw new Error("FORBIDDEN");
     }
     currentLabId = userRecord.lab.id;
  }

  return currentLabId;
}

export async function GET(req: NextRequest) {
  try {
    // 1. Resilient Auth Check
    let currentLabId;
    try {
      currentLabId = await getValidatedLabId(req);
    } catch (err: any) {
      const status = err.message === "UNAUTHORIZED" ? 401 : 403;
      return NextResponse.json({ error: err.message }, { status });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';

    // 2. Fetch all studies that have a report, ordered by newest first
    const archivedReports = await prisma.radiologyStudy.findMany({
      where: {
        labId: currentLabId, // <-- FIXED: Using securely resolved ID
        report: { isNot: null }, // Only studies that have reached the reporting stage
        
        // Apply search filter if a query exists
        ...(search ? {
          OR: [
            { patient: { name: { contains: search, mode: 'insensitive' } } },
            { patient: { phone: { contains: search, mode: 'insensitive' } } },
            { accessionNumber: { contains: search, mode: 'insensitive' } }
          ]
        } : {})
      },
      include: {
        patient: { select: { id: true, name: true, phone: true } },
        modality: { select: { type: true } },
        report: { select: { status: true, verifiedAt: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 100 // Limit to recent 100 for performance (Add pagination later)
    });

    // 3. Format data for the UI with strict null-checking
    const formattedData = archivedReports.map(study => ({
      id: study.id,
      accessionNo: study.accessionNumber,
      patientName: study.patient?.name || "Unknown Patient",
      patientPhone: study.patient?.phone || "N/A",
      scanName: study.scanName,
      modality: study.modality?.type || "UNKNOWN",
      status: study.report?.status || 'UNKNOWN',
      verifiedDate: study.report?.verifiedAt 
        ? new Date(study.report.verifiedAt).toLocaleString('en-IN', {
            day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
          }) 
        : 'Not Verified',
    }));

    return NextResponse.json(formattedData, { status: 200 });

  } catch (error) {
    console.error("Reports Archive GET Error:", error);
    return NextResponse.json({ error: "Failed to fetch reports archive" }, { status: 500 });
  }
}