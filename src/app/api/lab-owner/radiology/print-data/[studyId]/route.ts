import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getDataFromToken } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: { studyId: string } }
) {
  try {
    const user = await getDataFromToken(req);
    if (!user || !user.labId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { studyId } = params;

    // 1. Fetch the Study (Without the Lab include)
    const study = await prisma.radiologyStudy.findUnique({
      where: { 
        id: studyId,
        // To ensure security, verify this study belongs to the user's lab
        labId: user.labId 
      },
      include: {
        patient: true,
        modality: true,
        report: true,
      }
    });

    if (!study) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    // 2. Fetch the Lab and its Templates separately using the user's labId
    const labData = await prisma.lab.findUnique({
      where: { id: user.labId },
      include: {
        reportTemplates: true // This grabs your active letterhead config
      }
    });

    // 3. Merge them together so the frontend gets the exact structure it expects
    const finalPayload = {
      ...study,
      lab: labData
    };

    return NextResponse.json(finalPayload);

  } catch (error) {
    console.error("Print Data GET Error:", error);
    return NextResponse.json({ error: "Failed to fetch print data" }, { status: 500 });
  }
}