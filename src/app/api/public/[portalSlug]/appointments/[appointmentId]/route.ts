import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolvePublicLabId } from "@/lib/public-lab";

// The registered phone number is required before exposing a booking publicly.
export async function GET(
  req: NextRequest,
  { params }: { params: { portalSlug: string; appointmentId: string } },
) {
  const phone = req.nextUrl.searchParams.get("phone")?.trim();
  if (!phone) return NextResponse.json({ error: "Registered phone number is required." }, { status: 400 });

  const labId = await resolvePublicLabId(params.portalSlug);
  if (!labId) return NextResponse.json({ error: "Lab not found." }, { status: 404 });
  const appointment = await prisma.appointment.findFirst({
    where: {
      id: params.appointmentId,
      labId,
      patient: { phone },
    },
    select: {
      id: true, status: true, collectionMode: true, appointmentDate: true, timeSlot: true,
      collectionAddress: true, pincode: true, updatedAt: true, transactionId: true,
      patient: { select: { name: true, phone: true } },
      invoice: { select: { invoiceNumber: true, paymentStatus: true, grandTotal: true } },
      trip: { select: { phlebotomist: { select: { name: true, phone: true } } } },
    },
  });
  if (!appointment) return NextResponse.json({ error: "Booking not found." }, { status: 404 });

  const lab = await prisma.lab.findUnique({
    where: { id: labId },
    select: { name: true, phone: true },
  });

  return NextResponse.json({ 
    appointment: {
      ...appointment,
      lab
    } 
  });
}
