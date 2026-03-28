import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getDataFromToken } from '@/lib/auth';
import { format } from 'date-fns';

export async function GET(req: NextRequest) {
  try {
    const user = await getDataFromToken(req);
    if (!user || !user.labId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // 1. Fetch all studies that have been scanned (i.e., they exist in the PACS)
    // Exclude 'ORDERED' since those haven't happened yet.
    const pacsStudiesRaw = await prisma.radiologyStudy.findMany({
      where: {
        labId: user.labId,
        performedAt: { not: null }, // Only studies that actually happened
      },
      include: {
        patient: { select: { id: true, patientId: true, name: true } },
        modality: { select: { type: true } },
        report: { select: { status: true } }
      },
      orderBy: { performedAt: 'desc' },
      take: 500 // Limit to recent 500 for performance; add pagination in massive prod apps
    });

    // 2. Format the data for the frontend table
    const pacsStudies = pacsStudiesRaw.map(study => ({
      studyUid: study.studyInstanceUid || 'UNKNOWN-UID',
      accessionNo: study.accessionNumber,
      patientName: study.patient.name,
      patientId: (study.patient as any).patientId || study.patient.id.slice(0, 8), // Fallback if patientId is missing
      modality: study.modality.type,
      description: study.scanName,
      studyDate: study.performedAt ? format(new Date(study.performedAt), 'dd MMM yyyy, hh:mm a') : 'Unknown',
      instances: study.dicomInstances || 0,
      sizeMb: study.storageSizeMb || 0,
      status: 'ONLINE', // In a real app, you might query the actual PACS API to see if it's archived to cold storage
      reportStatus: study.report?.status || 'UNREAD'
    }));

    // 3. Calculate Storage Statistics
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
      percentUsed: percentUsed
    };

    return NextResponse.json({ studies: pacsStudies, storage: storageStats });

  } catch (error) {
    console.error("PACS API Error:", error);
    return NextResponse.json({ error: "Failed to fetch PACS data" }, { status: 500 });
  }
}