import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getDataFromToken } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> } // 'id' here is the invoiceId
) {
  try {
    // 1. Authenticate & Get Lab ID
    const user = await getDataFromToken(req);
    if (!user || !user.labId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: invoiceId } = await params;

    // 2. Find all Samples that contain tests belonging to this Invoice
    const samples = await prisma.sample.findMany({
      where: {
        labId: user.labId, // Security Check: Only samples from this lab
        tests: {
          some: {
            invoiceId: invoiceId
          }
        }
      },
      include: {
        // Only select the necessary patient demographic data for the barcode label
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
          where: {
            invoiceId: invoiceId // Important: Only include tests billed in THIS invoice
          },
          select: { 
            testCode: true, 
            testName: true 
          }
        }
      }
    });

    return NextResponse.json(samples);
    
  } catch (error) {
    console.error("Fetch Invoice Barcodes Error:", error);
    return NextResponse.json({ error: "Failed to load barcodes" }, { status: 500 });
  }
}