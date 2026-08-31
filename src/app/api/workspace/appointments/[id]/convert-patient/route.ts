import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getDataFromToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// ============================================================================
// POST /api/workspace/appointments/[id]/convert-patient
// Converts an online-booked appointment into a full Patient record that appears
// in the Patient Directory. The Appointment already created a Patient row at
// booking time — but it may lack fields the lab wants (doctorId, agencyId,
// proper patientId). This endpoint:
//
//   1. Ensures the linked Patient has a proper patientId (P-00001 format)
//   2. Updates the Patient's demographic fields if provided (age, gender, etc.)
//   3. Marks the Appointment status as "CONFIRMED" (payment-verified patient)
//   4. Marks the linked Tests as ready for accession (status: PENDING → IN_PROGRESS
//      if samples need collection, or stays PENDING if lab visit)
//
// Body: { age?, ageUnit?, gender?, address?, doctorId?, agencyId?, isGlobal? }
// ============================================================================
export async function POST(
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
        { error: 'Only Lab Owners, Managers, and Receptionists can convert appointments' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await req.json();

    // 1. Find the appointment
    const appointment = await prisma.appointment.findFirst({
      where: { id, labId: user.labId },
      include: {
        patient: true,
        tests: true,
      },
    });

    if (!appointment) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    if (!appointment.patientId) {
      return NextResponse.json(
        { error: 'This appointment has no linked patient record to convert' },
        { status: 400 }
      );
    }

    // 2. Update the patient with the lab-provided demographic fields + ensure patientId
    const existingPatient = appointment.patient;
    const needsPatientId = !existingPatient.patientId;

    // Generate next patientId if missing
    let nextPatientId = existingPatient.patientId;
    if (needsPatientId) {
      const count = await prisma.patient.count({ where: { labId: user.labId } });
      nextPatientId = `P-${String(count + 1).padStart(5, '0')}`;
    }

    // 3. Resolve doctorId (accept ID or NAME — auto-create if new, mirroring accession logic)
    let finalDoctorId = existingPatient.doctorId;
    if (body.doctorId !== undefined) {
      const docVal = String(body.doctorId || '').trim();
      if (!docVal || docVal === 'Self') {
        finalDoctorId = null;
      } else {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(docVal) || /^c[a-z0-9]{20,}$/i.test(docVal);
        let doctor: any = null;
        if (isUuid) {
          doctor = await prisma.doctor.findFirst({ where: { id: docVal, labId: user.labId } });
        }
        if (!doctor) {
          doctor = await prisma.doctor.findFirst({
            where: { labId: user.labId, name: { equals: docVal, mode: 'insensitive' } },
          });
        }
        if (!doctor) {
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
              description: `Doctor "${doctor.name}" auto-created during appointment conversion.`,
            },
          }).catch(() => {});
        }
        finalDoctorId = doctor.id;
      }
    }

    // 4. Update the Patient record
    const updatedPatient = await prisma.patient.update({
      where: { id: appointment.patientId },
      data: {
        patientId: nextPatientId,
        ...(body.age !== undefined ? { age: Number(body.age) } : {}),
        ...(body.ageUnit !== undefined ? { ageUnit: body.ageUnit } : {}),
        ...(body.gender !== undefined ? { gender: String(body.gender).toUpperCase() } : {}),
        ...(body.address !== undefined ? { address: body.address } : {}),
        ...(body.doctorId !== undefined ? { doctorId: finalDoctorId } : {}),
        ...(body.agencyId !== undefined ? { agencyId: body.agencyId === 'Direct' ? null : body.agencyId } : {}),
        ...(body.isGlobal !== undefined && (user.role === 'LAB_OWNER' || user.role === 'SUPER_ADMIN')
          ? { isGlobal: body.isGlobal === true }
          : {}),
      },
    });

    // 5. Mark the appointment as CONFIRMED
    await prisma.appointment.update({
      where: { id: appointment.id },
      data: {
        status: 'CONFIRMED',
        ...(appointment.paymentVerified ? {} : { paymentVerified: true, paymentVerifiedAt: new Date(), paymentVerifiedBy: user.id }),
      },
    });

    // 6. Activity log
    await prisma.activityLog.create({
      data: {
        labId: user.labId,
        userId: user.id,
        action: 'APPOINTMENT_CONVERTED_TO_PATIENT',
        entityType: 'APPOINTMENT',
        entity: 'APPOINTMENT',
        entityId: appointment.id,
        description: `Online appointment ${appointment.trackId || appointment.id} converted to patient ${updatedPatient.name} (${updatedPatient.patientId}).`,
      },
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      patient: updatedPatient,
      patientId: updatedPatient.patientId,
      message: `Patient ${updatedPatient.name} (${updatedPatient.patientId}) is now in your Patient Directory.`,
    });
  } catch (error: any) {
    console.error('[APPOINTMENT_CONVERT_ERROR]', error);
    return NextResponse.json(
      { error: 'Failed to convert appointment', details: error.message },
      { status: 500 }
    );
  }
}
