import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getDataFromToken } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> } // 'id' here is the sampleId
) {
  try {
    // 1. Authenticate & Get Lab ID
    const user = await getDataFromToken(req);
    if (!user || !user.labId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: sampleId } = await params;

    // 2. Fetch the specific Sample
    const sample = await prisma.sample.findUnique({
      where: {
        id: sampleId,
        labId: user.labId // Security Check
      },
      include: {
        patient: {
          select: {
            name: true,
            age: true,
            ageUnit: true,
            gender: true,
            patientId: true
          }
        },
        tests: {
          select: { 
            testCode: true, 
            testName: true 
          }
        }
      }
    });

    if (!sample) {
      return NextResponse.json({ error: 'Sample barcode not found' }, { status: 404 });
    }

    return NextResponse.json(sample);

  } catch (error) {
    console.error("Fetch Single Barcode Error:", error);
    return NextResponse.json({ error: "Failed to load barcode" }, { status: 500 });
  }
}