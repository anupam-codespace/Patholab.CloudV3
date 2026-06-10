import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getDataFromToken } from '@/lib/auth';

// =========================================================================
// GET: Fetch Patient Details
// =========================================================================
export async function GET(
  req: NextRequest, 
  { params }: { params: Promise<{ id: string }> } 
) {
  try {
    const user = await getDataFromToken(req);
    if (!user || !user.labId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const patient = await prisma.patient.findUnique({
      where: { 
        id: id, 
        labId: user.labId 
      }
    });

    // Don't return soft-deleted patients
    if (!patient || patient.deletedAt) {
      return NextResponse.json({ error: "Patient not found or has been deleted." }, { status: 404 });
    }

    return NextResponse.json(patient);

  } catch (error) {
    console.error("Fetch Patient Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// =========================================================================
// DELETE: Soft Delete Patient (Lab Owner Only)
// =========================================================================
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getDataFromToken(req);
    if (!user || !user.labId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 🛡️ SECURITY: Restrict to Lab Owners & Super Admins
    if (user.role !== 'LAB_OWNER' && user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ 
        error: 'Permission Denied. Only Lab Owners can delete patient records.' 
      }, { status: 403 });
    }

    const { id } = await params;

    // Verify ownership and existence
    const patient = await prisma.patient.findUnique({
      where: { id: id, labId: user.labId }
    });

    if (!patient || patient.deletedAt) {
      return NextResponse.json({ error: "Patient not found or already deleted." }, { status: 404 });
    }

    // ✅ PERFORM SOFT DELETE (Keeps foreign keys intact)
    await prisma.$transaction(async (tx) => {
      // 1. Soft delete the patient
      await tx.patient.update({
        where: { id: id },
        data: { 
          deletedAt: new Date(),
          // Optional: If you have an active status, uncomment the line below
          // isActive: false 
        }
      });

      // 2. Log the deletion in the Activity/Audit Log
      await tx.activityLog.create({
        data: {
          labId: user.labId,
          userId: user.id,
          action: 'PATIENT_DELETED',
          entityType: 'PATIENT',
          entity: 'PATIENT',
          entityId: id,
          description: `Patient ${patient.name} was purged (soft-deleted) by Lab Owner.`,
        }
      });
    });

    return NextResponse.json({ success: true, message: "Patient record securely removed." });

  } catch (error: any) {
    console.error("Delete Error:", error);
    return NextResponse.json({ error: "Failed to remove patient record." }, { status: 500 });
  }
}