import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getDataFromToken } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = await getDataFromToken(req);
    if (!user || !user.labId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';

    // Fetch all studies that have a report, ordered by newest first
    const archivedReports = await prisma.radiologyStudy.findMany({
      where: {
        labId: user.labId,
        report: { isNot: null }, // Only studies that have reached the reporting stage
        OR: search ? [
          { patient: { name: { contains: search, mode: 'insensitive' } } },
          { patient: { phone: { contains: search, mode: 'insensitive' } } },
          { accessionNumber: { contains: search, mode: 'insensitive' } }
        ] : undefined
      },
      include: {
        patient: { select: { id: true, name: true, phone: true } },
        modality: { select: { type: true } },
        report: { select: { status: true, verifiedAt: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 100 // Limit to recent 100 for performance (Add pagination later)
    });

    // Format data for the UI
    const formattedData = archivedReports.map(study => ({
      id: study.id,
      accessionNo: study.accessionNumber,
      patientName: study.patient.name,
      patientPhone: study.patient.phone,
      scanName: study.scanName,
      modality: study.modality.type,
      status: study.report?.status || 'UNKNOWN',
      verifiedDate: study.report?.verifiedAt ? new Date(study.report.verifiedAt).toLocaleString('en-IN') : 'Not Verified',
    }));

    return NextResponse.json(formattedData);
  } catch (error) {
    console.error("Reports Archive GET Error:", error);
    return NextResponse.json({ error: "Failed to fetch reports" }, { status: 500 });
  }
}