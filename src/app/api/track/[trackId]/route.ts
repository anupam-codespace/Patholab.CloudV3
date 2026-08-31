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
        patient: { select: { name: true, phone: true } },
        tests: { select: { testName: true, status: true } },
        invoice: { select: { grandTotal: true, paymentStatus: true, invoiceNumber: true } },
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
      select: { name: true, city: true, phone: true, logo: true },
    });

    // ✅ v3.2.3: Null-safe patient name masking (was crashing with
    // `Cannot read properties of null (reading 'split')` when patient.name was null)
    const patientName = appointment.patient?.name || 'Patient';
    const nameParts = patientName.trim().split(/\s+/).filter(Boolean);
    const maskedName = nameParts.length > 1
      ? `${nameParts[0]} ${nameParts[nameParts.length - 1][0]}.`
      : nameParts[0] || 'Patient';

    const timeline = [
      { label: "Booked", completed: true, timestamp: formatIST(appointment.createdAt) },
      { label: "Payment Verified", completed: appointment.paymentVerified, timestamp: appointment.paymentVerifiedAt ? formatIST(appointment.paymentVerifiedAt) : null },
      { label: "Sample Collected", completed: ["SAMPLE_COLLECTED", "IN_PROGRESS", "COMPLETED", "DELIVERED"].includes(appointment.status), timestamp: null },
      { label: "Processing", completed: ["IN_PROGRESS", "COMPLETED", "DELIVERED"].includes(appointment.status), timestamp: null },
      { label: "Report Ready", completed: ["COMPLETED", "DELIVERED"].includes(appointment.status), timestamp: null },
    ];

    return NextResponse.json({
      trackId: appointment.trackId,
      patientName: maskedName,
      labName: lab?.name,
      labCity: lab?.city,
      labPhone: lab?.phone,
      labLogo: lab?.logo,
      testName: appointment.tests?.map((t: any) => t.testName).join(", ") || "Lab Tests",
      collectionMode: appointment.collectionMode,
      appointmentDate: formatIST(appointment.appointmentDate),
      timeSlot: appointment.timeSlot,
      paymentVerified: appointment.paymentVerified,
      paymentStatus: appointment.invoice?.paymentStatus || "PENDING",
      amount: Number(appointment.invoice?.grandTotal || 0),
      status: appointment.status,
      timeline,
    });
  } catch (error: any) {
    console.error("Track API error:", error.message);
    return NextResponse.json({ error: "Tracking failed: " + error.message }, { status: 500 });
  }
}
