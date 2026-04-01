import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getDataFromToken } from '@/lib/auth';
import { format } from 'date-fns';

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

    // 2. Fetch all studies that have been scanned (i.e., they exist in the PACS)
    // Exclude 'ORDERED' since those haven't happened yet.
    const pacsStudiesRaw = await prisma.radiologyStudy.findMany({
      where: {
        labId: currentLabId, // <-- FIXED: Using securely resolved ID
        performedAt: { not: null }, // Only studies that actually happened
      },
      include: {
        patient: { select: { id: true, patientId: true, name: true } },
        modality: { select: { type: true } },
        report: { select: { status: true } }
      },
      orderBy: { performedAt: 'desc' },
      take: 500 // Limit to recent 500 for performance
    });

    // 3. Format the data for the frontend table
    const pacsStudies = pacsStudiesRaw.map((study) => ({
      studyUid: study.studyInstanceUid || 'UNKNOWN-UID',
      accessionNo: study.accessionNumber,
      patientName: study.patient?.name || "Unknown Patient",
      // Safe fallback if patientId is missing
      patientId: study.patient?.patientId || study.patient?.id?.slice(0, 8) || "N/A", 
      modality: study.modality?.type || "UNKNOWN",
      description: study.scanName,
      studyDate: study.performedAt ? format(new Date(study.performedAt), 'dd MMM yyyy, hh:mm a') : 'Unknown',
      instances: study.dicomInstances || 0,
      sizeMb: study.storageSizeMb || 0,
      status: 'ONLINE', 
      reportStatus: study.report?.status || 'UNREAD'
    }));

    // 4. Calculate Storage Statistics
    // Assuming the lab has a 10 TB (10,000,000 MB) plan limit
    const MAX_STORAGE_MB = 10000000; 
    
    const totalUsedMb = pacsStudiesRaw.reduce((sum, study) => sum + (study.storageSizeMb || 0), 0);
    const percentUsed = Math.min(Math.round((totalUsedMb / MAX_STORAGE_MB) * 100), 100);

    // Helper to format MB to GB/TB nicely
    const formatSize = (mb: number) => {
      if (mb > 1000000) return `${(mb / 1000000).toFixed(2)} TB`;
      if (mb > 1000) return `${(mb / 1000).toFixed(2)} GB`;
      return `${mb.toFixed(0)} MB`;
    };

    const storageStats = {
      total: formatSize(MAX_STORAGE_MB),
      used: formatSize(totalUsedMb),
      percentUsed: percentUsed > 0 ? percentUsed : (pacsStudies.length > 0 ? 0.1 : 0) // Tiny sliver if data exists
    };

    return NextResponse.json({ studies: pacsStudies, storage: storageStats }, { status: 200 });

  } catch (error) {
    console.error("PACS API Error:", error);
    return NextResponse.json({ error: "Failed to fetch PACS data" }, { status: 500 });
  }
}