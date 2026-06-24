import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getDataFromToken } from '@/lib/auth';

// 🌟 THE FIX: Force Next.js to NEVER cache this route so newly created patients appear instantly!
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// =========================================================================
// GET: Fetch Patient Details (SMART ROUTE WITH GOD MODE DEBUGGING)
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

    // Await the params object (Required in newer Next.js versions)
    const resolvedParams = await params;
    const searchId = resolvedParams.id;

    console.log(`[API] Fetching Patient: ${searchId} for Lab: ${user.labId}`);

    // 🌟 SMART QUERY: Check if the passed ID matches the internal UUID OR the readable patientId (PT-1234)
    const patient = await prisma.patient.findFirst({
      where: { 
        labId: user.labId,
        deletedAt: null, // Ensure we don't return soft-deleted patients
        OR: [
          { id: searchId },
          { patientId: searchId }
        ]
      }
    });

    // 🚨 IF PATIENT IS NOT FOUND, RUN DIAGNOSTICS TO FIND OUT WHY
    if (!patient) {
      console.error(`[API] ❌ Patient NOT FOUND in standard scope: ${searchId}`);
      
      // "God Mode" check: Look up the patient without any LabID or DeletedAt filters
      const debugPatient = await prisma.patient.findFirst({
        where: { 
          OR: [ { id: searchId }, { patientId: searchId } ] 
        }
      });

      if (debugPatient) {
        console.log("\n=======================================================");
        console.log("🚨 LIMS SECURITY DIAGNOSTIC REPORT 🚨");
        console.log("The patient exists in the database, but was blocked by filters.");
        console.log(`- Requesting User's Lab ID:  ${user.labId}`);
        console.log(`- Actual Patient's Lab ID:   ${debugPatient.labId}`);
        console.log(`- Is Lab ID Match?:          ${user.labId === debugPatient.labId ? '✅ YES' : '❌ NO'}`);
        console.log(`- Was Patient Deleted?:      ${debugPatient.deletedAt ? '❌ YES (Soft Deleted)' : '✅ NO'}`);
        console.log("=======================================================\n");

        if (debugPatient.labId !== user.labId) {
          return NextResponse.json({ error: "Permission Denied: Patient belongs to a different Laboratory." }, { status: 403 });
        }
        if (debugPatient.deletedAt) {
          return NextResponse.json({ error: "Patient record has been deleted." }, { status: 404 });
        }
      } else {
        console.log(`🚨 DIAGNOSTIC: Patient ${searchId} is entirely missing from the database.`);
      }

      return NextResponse.json({ error: "Patient not found." }, { status: 404 });
    }

    console.log(`[API] ✅ Patient Found: ${patient.name}`);
    return NextResponse.json(patient);

  } catch (error) {
    console.error("[API] Fetch Patient Error:", error);
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

    if (user.role !== 'LAB_OWNER' && user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ 
        error: 'Permission Denied. Only Lab Owners can delete patient records.' 
      }, { status: 403 });
    }

    const resolvedParams = await params;
    const searchId = resolvedParams.id;

    const patient = await prisma.patient.findFirst({
      where: { 
        labId: user.labId,
        deletedAt: null,
        OR: [
          { id: searchId },
          { patientId: searchId }
        ]
      }
    });

    if (!patient) {
      return NextResponse.json({ error: "Patient not found or already deleted." }, { status: 404 });
    }

    // PERFORM SOFT DELETE
    await prisma.$transaction(async (tx) => {
      await tx.patient.update({
        where: { id: patient.id },
        data: { deletedAt: new Date() }
      });

      await tx.activityLog.create({
        data: {
          labId: user.labId,
          userId: user.id,
          action: 'PATIENT_DELETED',
          entityType: 'PATIENT',
          entity: 'PATIENT',
          entityId: patient.id,
          description: `Patient ${patient.name} (${patient.patientId}) was purged (soft-deleted) by Lab Owner.`,
        }
      });
    });

    return NextResponse.json({ success: true, message: "Patient record securely removed." });

  } catch (error: any) {
    console.error("Delete Error:", error);
    return NextResponse.json({ error: "Failed to remove patient record." }, { status: 500 });
  }
}