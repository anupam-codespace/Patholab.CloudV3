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
// PATCH: Update Patient Details (all fields including phone, name, age, etc.)
//
// v3.2.1 FIX: Previously this endpoint did NOT exist, so the Edit Patient page
// would silently fail (404/405). The edit page called PATCH but the API only
// had GET + DELETE handlers. Now we implement full PATCH support for ALL
// editable fields: name, phone, email, age, ageUnit, gender, dateOfBirth,
// address, doctorId, agencyId, abhaNumber, passport, srfId, title, isGlobal.
//
// ✅ Phone number is explicitly editable. If the new phone collides with
// another patient's phone in the same lab, we return 409 Conflict.
// =========================================================================
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getDataFromToken(req);
    if (!user || !user.labId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'LAB_OWNER' && user.role !== 'SUPER_ADMIN' && user.role !== 'LAB_MANAGER' && user.role !== 'RECEPTIONIST') {
      return NextResponse.json(
        { error: 'Permission Denied. Only Lab Owners, Managers, and Receptionists can edit patient records.' },
        { status: 403 }
      );
    }

    const resolvedParams = await params;
    const searchId = resolvedParams.id;

    // 1. Find the patient (by UUID or patientId like P-00123)
    const patient = await prisma.patient.findFirst({
      where: {
        labId: user.labId,
        deletedAt: null,
        OR: [
          { id: searchId },
          { patientId: searchId },
        ],
      },
    });

    if (!patient) {
      return NextResponse.json({ error: 'Patient not found.' }, { status: 404 });
    }

    const body = await req.json();

    // 2. Build the update payload — only include fields that are present in the body
    const updateData: any = {};

    if (body.name !== undefined) {
      const trimmed = String(body.name).trim();
      if (!trimmed) return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 });
      updateData.name = trimmed;
    }

    // ✅ Phone is the key v3.2.1 fix — previously the edit page had the field
    // but the API had no PATCH handler, so phone edits were silently dropped.
    if (body.phone !== undefined) {
      const phone = String(body.phone).trim().replace(/\D/g, '');
      if (phone.length < 10) {
        return NextResponse.json({ error: 'Phone number must be at least 10 digits' }, { status: 400 });
      }

      // Check for phone collision with ANOTHER patient in the same lab
      const conflict = await prisma.patient.findFirst({
        where: {
          labId: user.labId,
          phone: phone,
          id: { not: patient.id },
          deletedAt: null,
        },
        select: { id: true, name: true, patientId: true },
      });
      if (conflict) {
        return NextResponse.json({
          error: `Phone number already in use by another patient: ${conflict.name} (${conflict.patientId}).`,
        }, { status: 409 });
      }
      updateData.phone = phone;
    }

    if (body.email !== undefined) updateData.email = body.email?.trim() || null;
    if (body.age !== undefined) {
      const ageNum = Number(body.age);
      if (!isNaN(ageNum) && ageNum >= 0) updateData.age = ageNum;
    }
    if (body.ageUnit !== undefined) updateData.ageUnit = body.ageUnit || 'Years';
    if (body.gender !== undefined) {
      const g = String(body.gender).toUpperCase();
      if (['MALE', 'FEMALE', 'OTHER', 'CUSTOM'].includes(g)) {
        updateData.gender = g;
      }
    }
    if (body.dateOfBirth !== undefined) {
      updateData.dateOfBirth = body.dateOfBirth ? new Date(body.dateOfBirth) : null;
    }
    if (body.address !== undefined) updateData.address = body.address?.trim() || null;
    if (body.title !== undefined) updateData.title = body.title || null;
    if (body.abhaNumber !== undefined) updateData.abhaNumber = body.abhaNumber?.trim() || null;
    if (body.passport !== undefined) updateData.passportNumber = body.passport?.trim() || null;
    if (body.srfId !== undefined) updateData.srfId = body.srfId?.trim() || null;
    if (body.pincode !== undefined) updateData.pincode = body.pincode?.trim() || null;

    // ✅ Edit global/branch scope (Lab Owner/Manager only)
    if (body.isGlobal !== undefined && (user.role === 'LAB_OWNER' || user.role === 'SUPER_ADMIN')) {
      updateData.isGlobal = body.isGlobal === true;
      if (body.isGlobal === true) {
        updateData.branchId = null; // global patient has no branch
      } else if (body.branchId) {
        updateData.branchId = body.branchId;
      }
    }

    // ✅ Doctor reassignment — accept ID or NAME (auto-create if new)
    if (body.doctorId !== undefined) {
      const docVal = String(body.doctorId || '').trim();
      if (!docVal || docVal === 'Self') {
        updateData.doctorId = null;
      } else {
        // Try by ID
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(docVal) || /^c[a-z0-9]{20,}$/i.test(docVal);
        let doctor: any = null;
        if (isUuid) {
          doctor = await prisma.doctor.findFirst({ where: { id: docVal, labId: user.labId } });
        }
        if (!doctor) {
          // Try by name
          doctor = await prisma.doctor.findFirst({
            where: { labId: user.labId, name: { equals: docVal, mode: 'insensitive' } },
          });
        }
        if (!doctor) {
          // Auto-create new doctor
          doctor = await prisma.doctor.create({
            data: {
              labId: user.labId,
              name: docVal,
              commissionRate: 0,
              commissionType: 'PERCENTAGE',
            },
          });
          await prisma.activityLog.create({
            data: {
              labId: user.labId,
              userId: user.id,
              action: 'DOCTOR_AUTO_CREATED',
              entityType: 'DOCTOR',
              entity: 'DOCTOR',
              entityId: doctor.id,
              description: `Doctor "${doctor.name}" auto-created during patient edit.`,
            },
          }).catch(() => { /* non-fatal */ });
        }
        updateData.doctorId = doctor.id;
      }
    }

    // ✅ Agency reassignment — same logic as doctor
    if (body.agencyId !== undefined) {
      const agVal = String(body.agencyId || '').trim();
      if (!agVal || agVal === 'Direct') {
        updateData.agencyId = null;
      } else {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(agVal) || /^c[a-z0-9]{20,}$/i.test(agVal);
        let agency: any = null;
        if (isUuid) {
          agency = await prisma.agency.findFirst({ where: { id: agVal, labId: user.labId } });
        }
        if (!agency) {
          agency = await prisma.agency.findFirst({
            where: { labId: user.labId, agencyName: { equals: agVal, mode: 'insensitive' } },
          });
        }
        if (!agency) {
          agency = await prisma.agency.create({
            data: {
              labId: user.labId,
              agencyName: agVal,
              commissionRate: 0,
              commissionType: 'PERCENTAGE',
            },
          });
          await prisma.activityLog.create({
            data: {
              labId: user.labId,
              userId: user.id,
              action: 'AGENCY_AUTO_CREATED',
              entityType: 'AGENCY',
              entity: 'AGENCY',
              entityId: agency.id,
              description: `Agency "${agency.agencyName}" auto-created during patient edit.`,
            },
          }).catch(() => { /* non-fatal */ });
        }
        updateData.agencyId = agency.id;
      }
    }

    // 3. Perform the update
    const updated = await prisma.patient.update({
      where: { id: patient.id },
      data: updateData,
    });

    // 4. Activity log (non-fatal)
    await prisma.activityLog.create({
      data: {
        labId: user.labId,
        userId: user.id,
        action: 'PATIENT_UPDATED',
        entityType: 'PATIENT',
        entity: 'PATIENT',
        entityId: patient.id,
        description: `Patient ${updated.name} (${updated.patientId}) details updated by ${user.role}. Fields changed: ${Object.keys(updateData).join(', ')}.`,
      },
    }).catch(() => { /* non-fatal */ });

    return NextResponse.json({
      success: true,
      patient: updated,
      message: 'Patient details updated successfully.',
    });

  } catch (error: any) {
    console.error('[PATIENT_PATCH_ERROR]', error);
    return NextResponse.json(
      { error: 'Failed to update patient', details: error.message },
      { status: 500 }
    );
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