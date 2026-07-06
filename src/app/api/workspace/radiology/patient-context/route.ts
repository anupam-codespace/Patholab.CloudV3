import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getDataFromToken } from '@/lib/auth';
import { format } from 'date-fns';

export async function GET(req: NextRequest) {
  try {
    const user = await getDataFromToken(req);
    if (!user || !user.labId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const patientId = searchParams.get('patientId');
    const currentStudyId = searchParams.get('currentStudyId'); // To exclude the current scan from "Previous Studies"

    if (!patientId) return NextResponse.json({ error: 'Patient ID is required' }, { status: 400 });

    // 1. Fetch Previous Radiology Studies for this patient
    const previousStudies = await prisma.radiologyStudy.findMany({
      where: { 
        patientId: patientId,
        labId: user.labId,
        id: { not: currentStudyId || undefined } // Exclude the current study
      },
      include: { modality: true },
      orderBy: { performedAt: 'desc' },
      take: 3
    });
    //   TEMPORARILY COMMENTED OUT UNTIL CORRECT LAB NAME NOT FOUND
    // 2. Fetch Recent Lab Results (Assuming you have a LabOrder or TestResult table)
    // Adjust this query based on your exact Lab schema
  /*  const recentLabs = await prisma.labOrder.findMany({
      where: { patientId: patientId, labId: user.labId, status: 'COMPLETED' },
      include: { tests: true },
      orderBy: { createdAt: 'desc' },
      take: 1
    });*/

    // 3. Format the data for the frontend
    return NextResponse.json({
      previousStudies: previousStudies.map(study => ({
        id: study.id,
        name: study.scanName || `${study.modality?.type} Scan`,
        date: study.performedAt ? format(new Date(study.performedAt), 'dd-MMM-yyyy') : 'Unknown',
        uid: study.studyInstanceUid
      })),
      // Mocking the specific lab values for the UI until you extract exact Hb/WBC from your specific JSON results
      recentLabs: recentLabs.length > 0 ? {
        hb: "11.2", wbc: "8.4", creatinine: "1.8", esr: "52"
      } : null
    });

  } catch (error) {
    console.error("Patient Context Error:", error);
    return NextResponse.json({ error: "Failed to fetch context" }, { status: 500 });
  }
}