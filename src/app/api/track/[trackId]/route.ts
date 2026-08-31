import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { formatIST } from "@/lib/timezone";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: Promise<{ trackId: string }> }) {
  try {
    const { trackId } = await params;

    const appointment = await prisma.appointment.findFirst({
      where: { trackId },
      include: {
        patient: { select: { name: true, phone: true, patientId: true } },
        tests: {
          include: {
            testTemplate: { select: { name: true, code: true, tatHours: true } },
            sample: { select: { sampleId: true, status: true, collectedAt: true } },
          },
        },
        invoice: { select: { grandTotal: true, paymentStatus: true, invoiceNumber: true, subtotal: true, discount: true, totalTax: true } },
        branch: { select: { id: true, name: true, address: true, city: true, phone: true } },
      },
    });

    if (!appointment) {
      return NextResponse.json({ error: "Tracking ID not found", trackId }, { status: 404 });
    }

    // ✅ v3.2.3: Appointment has only `labId` scalar (no `lab` relation),
    // so fetch the lab separately to display lab name/city/phone on the
    // public tracking page.
    const lab = await prisma.lab.findUnique({
      where: { id: appointment.labId },
      select: { name: true, city: true, phone: true, logo: true, address: true, upiId: true },
    });

    // ✅ v3.2.4: Fetch the home-collection trip (if any) for detailed home-collection tracking
    let trip: any = null;
    if (appointment.tripId) {
      trip = await prisma.homeCollectionTrip.findUnique({
        where: { id: appointment.tripId },
        select: {
          id: true,
          status: true,
          scheduledDate: true,
          startedAt: true,
          completedAt: true,
          startLocation: true,
          endLocation: true,
          phlebotomistId: true,
        },
      });
      if (trip) {
        const phleb = await prisma.user.findUnique({
          where: { id: trip.phlebotomistId },
          select: { name: true, phone: true },
        });
        trip.phlebotomist = phleb;
      }
    }

    // ✅ v3.2.3: Null-safe patient name masking (was crashing with
    // `Cannot read properties of null (reading 'split')` when patient.name was null)
    const patientName = appointment.patient?.name || 'Patient';
    const nameParts = patientName.trim().split(/\s+/).filter(Boolean);
    const maskedName = nameParts.length > 1
      ? `${nameParts[0]} ${nameParts[nameParts.length - 1][0]}.`
      : nameParts[0] || 'Patient';

    // ✅ v3.2.4: Build a richer timeline that adapts to collection mode
    const isHomeCollection = appointment.collectionMode === 'HOME_COLLECTION';
    const timeline = [
      { label: "Booked", completed: true, timestamp: formatIST(appointment.createdAt), icon: 'booked' },
      { label: "Payment Verified", completed: appointment.paymentVerified, timestamp: appointment.paymentVerifiedAt ? formatIST(appointment.paymentVerifiedAt) : null, icon: 'payment' },
      ...(isHomeCollection
        ? [{ label: "Phlebotomist Assigned", completed: !!trip, timestamp: trip ? formatIST(trip.scheduledDate) : null, icon: 'assigned' }]
        : []),
      ...(isHomeCollection
        ? [{ label: "On the Way", completed: trip?.status === 'STARTED' || trip?.status === 'IN_PROGRESS' || trip?.status === 'COMPLETED', timestamp: trip?.startedAt ? formatIST(trip.startedAt) : null, icon: 'transit' }]
        : []),
      { label: "Sample Collected", completed: ["SAMPLE_COLLECTED", "IN_PROGRESS", "COMPLETED", "DELIVERED"].includes(appointment.status) || trip?.status === 'COMPLETED', timestamp: null, icon: 'collected' },
      { label: "Processing in Lab", completed: ["IN_PROGRESS", "COMPLETED", "DELIVERED"].includes(appointment.status), timestamp: null, icon: 'processing' },
      { label: "Report Ready", completed: ["COMPLETED", "DELIVERED"].includes(appointment.status), timestamp: null, icon: 'report' },
    ];

    // ✅ v3.2.4: Per-test status breakdown for detailed tracking
    const testDetails = appointment.tests?.map((t: any) => ({
      id: t.id,
      name: t.testName,
      code: t.testCode,
      status: t.status,
      tatHours: t.testTemplate?.tatHours || null,
      sample: t.sample ? {
        sampleId: t.sample.sampleId,
        status: t.sample.status,
        collectedAt: t.sample.collectedAt ? formatIST(t.sample.collectedAt) : null,
      } : null,
    })) || [];

    return NextResponse.json({
      trackId: appointment.trackId,
      patientName: maskedName,
      patientId: appointment.patient?.patientId || null,
      labName: lab?.name,
      labCity: lab?.city,
      labPhone: lab?.phone,
      labLogo: lab?.logo,
      labAddress: lab?.address,
      branchName: appointment.branch?.name,
      branchAddress: appointment.branch?.address,
      branchCity: appointment.branch?.city,
      branchPhone: appointment.branch?.phone,
      testName: appointment.tests?.map((t: any) => t.testName).join(", ") || "Lab Tests",
      testDetails,
      collectionMode: appointment.collectionMode,
      collectionAddress: appointment.collectionAddress,
      pincode: appointment.pincode,
      appointmentDate: formatIST(appointment.appointmentDate),
      timeSlot: appointment.timeSlot,
      paymentVerified: appointment.paymentVerified,
      paymentStatus: appointment.invoice?.paymentStatus || "PENDING",
      amount: Number(appointment.invoice?.grandTotal || 0),
      subtotal: Number(appointment.invoice?.subtotal || 0),
      discountAmount: Number(appointment.invoice?.discount || 0),
      taxAmount: Number(appointment.invoice?.totalTax || 0),
      invoiceNumber: appointment.invoice?.invoiceNumber,
      transactionId: appointment.transactionId,
      paymentMode: appointment.paymentMode,
      status: appointment.status,
      timeline,
      trip: trip ? {
        status: trip.status,
        scheduledDate: formatIST(trip.scheduledDate),
        startedAt: trip.startedAt ? formatIST(trip.startedAt) : null,
        completedAt: trip.completedAt ? formatIST(trip.completedAt) : null,
        phlebotomist: trip.phlebotomist ? {
          name: trip.phlebotomist.name,
          phone: trip.phlebotomist.phone,
        } : null,
      } : null,
    });
  } catch (error: any) {
    console.error("Track API error:", error.message);
    return NextResponse.json({ error: "Tracking failed: " + error.message }, { status: 500 });
  }
}
