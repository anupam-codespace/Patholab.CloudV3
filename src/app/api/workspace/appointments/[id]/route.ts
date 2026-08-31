import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getDataFromToken } from '@/lib/auth';
import { formatIST, formatISTWithSeconds } from '@/lib/timezone';

export const dynamic = 'force-dynamic';

// ============================================================================
// GET: Detailed appointment view (for the appointment detail page)
// Returns everything: patient, tests, invoice, sample, trip, payment, branch
// ============================================================================
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

    const appointment = await prisma.appointment.findFirst({
      where: { id, labId: user.labId },
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            patientId: true,
            age: true,
            ageUnit: true,
            gender: true,
            address: true,
            pincode: true,
            dateOfBirth: true,
            doctorId: true,
            doctor: { select: { id: true, name: true } },
            agencyId: true,
            agency: { select: { id: true, agencyName: true } },
          },
        },
        branch: { select: { id: true, name: true, address: true, city: true, phone: true } },
        tests: {
          include: {
            testTemplate: { select: { id: true, name: true, code: true, tatHours: true } },
            sample: { select: { id: true, sampleId: true, status: true, collectedAt: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            subtotal: true,
            discountAmount: true,
            totalTax: true,
            grandTotal: true,
            status: true,
            paymentStatus: true,
            createdAt: true,
            items: true,
          },
        },
        trip: {
          include: {
            phlebotomist: { select: { id: true, name: true, phone: true } },
          },
        },
      },
    });

    if (!appointment) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    // Fetch lab separately (Appointment has only labId scalar, no relation)
    const lab = await prisma.lab.findUnique({
      where: { id: appointment.labId },
      select: {
        id: true,
        name: true,
        upiId: true,
        upiQrCode: true,
        phone: true,
        email: true,
        address: true,
        city: true,
      },
    });

    // Serialize Decimal fields + timestamps
    const serialized = {
      ...appointment,
      appointmentDate: formatIST(appointment.appointmentDate),
      createdAt: formatIST(appointment.createdAt),
      paymentVerifiedAt: appointment.paymentVerifiedAt ? formatIST(appointment.paymentVerifiedAt) : null,
      paymentCollected: Number(appointment.paymentCollected || 0),
      tests: appointment.tests.map(t => ({
        ...t,
        price: Number(t.price || 0),
        finalPrice: Number(t.finalPrice || 0),
        sample: t.sample ? {
          ...t.sample,
          collectedAt: t.sample.collectedAt ? formatIST(t.sample.collectedAt) : null,
        } : null,
      })),
      invoice: appointment.invoice ? {
        ...appointment.invoice,
        subtotal: Number(appointment.invoice.subtotal || 0),
        discountAmount: Number(appointment.invoice.discountAmount || 0),
        totalTax: Number(appointment.invoice.totalTax || 0),
        grandTotal: Number(appointment.invoice.grandTotal || 0),
        createdAt: formatIST(appointment.invoice.createdAt),
      } : null,
      trip: appointment.trip ? {
        ...appointment.trip,
        scheduledDate: formatIST(appointment.trip.scheduledDate),
        startedAt: appointment.trip.startedAt ? formatIST(appointment.trip.startedAt) : null,
        completedAt: appointment.trip.completedAt ? formatIST(appointment.trip.completedAt) : null,
      } : null,
      lab,
    };

    return NextResponse.json({ appointment: serialized });
  } catch (error: any) {
    console.error('[APPOINTMENT_DETAIL_GET]', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}
