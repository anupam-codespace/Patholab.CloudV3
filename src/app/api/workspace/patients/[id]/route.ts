import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getDataFromToken } from '@/lib/auth';

// ✅ Fix 1: Update type to Promise<{ id: string }> for Next.js 15
export async function GET(
  req: NextRequest, 
  { params }: { params: Promise<{ id: string }> } 
) {
  try {
    const user = await getDataFromToken(req);
    if (!user || !user.labId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ✅ Fix 2: Await the params before using them
    const { id } = await params;

    const patient = await prisma.patient.findUnique({
      where: { 
        id: id, 
        labId: user.labId 
      }
    });

    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    return NextResponse.json(patient);

  } catch (error) {
    console.error("Fetch Patient Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// ✅ Fix 3: Update DELETE params to match Next.js 15 signature as well
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getDataFromToken(req);
    if (!user || !user.labId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Await params here too
    const { id } = await params;

    // Verify ownership
    const patient = await prisma.patient.findUnique({
      where: { id: id, labId: user.labId }
    });

    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    // Perform Delete
    await prisma.patient.delete({
      where: { id: id }
    });

    return NextResponse.json({ success: true, message: "Patient deleted" });

  } catch (error: any) {
    console.error("Delete Error:", error);
    // Handle foreign key constraints (e.g., if patient has invoices)
    if (error.code === 'P2003') {
        return NextResponse.json({ error: "Cannot delete: Patient has active tests or invoices." }, { status: 400 });
    }
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}