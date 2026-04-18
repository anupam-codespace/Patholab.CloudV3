import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getDataFromToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const user = await getDataFromToken(req);
    if (!user || !user.labId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { ids } = await req.json();

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return NextResponse.json({ error: "No IDs provided" }, { status: 400 });
    }

    // Perform Bulk Delete (Only for patients belonging to this Lab)
    const result = await prisma.patient.deleteMany({
      where: {
        id: { in: ids },
        labId: user.labId // Security Check
      }
    });

    return NextResponse.json({ success: true, count: result.count });

  } catch (error: any) {
    console.error("Bulk Delete Error:", error);
    // Handle foreign key constraints (e.g., invoices exist)
    if (error.code === 'P2003') {
        return NextResponse.json({ error: "Cannot delete some patients because they have active tests or invoices." }, { status: 400 });
    }
    return NextResponse.json({ error: "Bulk delete failed" }, { status: 500 });
  }
}