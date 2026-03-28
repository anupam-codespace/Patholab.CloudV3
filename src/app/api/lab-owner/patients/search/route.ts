import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user?.labId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const query = searchParams.get('query');
    const type = searchParams.get('type') || 'PHONE'; // PHONE | NAME | ABHA

    if (!query) return NextResponse.json([]);

    let whereClause: any = { labId: user.labId };

    // Search Logic
    if (type === 'PHONE') {
        whereClause.phone = { contains: query };
    } else if (type === 'NAME') {
        whereClause.name = { contains: query, mode: 'insensitive' };
    } else if (type === 'ABHA') {
        whereClause.abhaNumber = { contains: query };
    }

    const patients = await prisma.patient.findMany({
      where: whereClause,
      take: 5, // Limit results
      include: {
        invoices: {
          take: 3,
          orderBy: { createdAt: 'desc' },
          select: { id: true, invoiceNumber: true, createdAt: true, grandTotal: true, status: true }
        },
        tests: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          select: { id: true, testName: true, status: true, testCode: true }
        }
      }
    });

    return NextResponse.json(patients);

  } catch (error) {
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}