import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: { invoiceId: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user?.labId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Logic: Find all Samples that contain tests belonging to this Invoice
    const samples = await prisma.sample.findMany({
      where: {
        tests: {
          some: {
            invoiceId: params.invoiceId
          }
        }
      },
      include: {
        patient: true,
        tests: {
            select: { testCode: true, testName: true }
        }
      }
    });

    return NextResponse.json(samples);
  } catch (error) {
    return NextResponse.json({ error: "Failed to load barcodes" }, { status: 500 });
  }
}