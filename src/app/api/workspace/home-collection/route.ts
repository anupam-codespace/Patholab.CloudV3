import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDataFromToken } from "@/lib/auth";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getDataFromToken(req);
    if (!user || !user.labId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const appointments = await prisma.appointment.findMany({
      where: { labId: user.labId, source: "ONLINE_PORTAL" },
      include: {
        patient: { select: { name: true, phone: true, patientId: true } },
        tests: { select: { testName: true } },
        invoice: { select: { grandTotal: true, paymentStatus: true, invoiceNumber: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      appointments: appointments.map(a => ({
        ...a,
        paymentCollected: Number(a.paymentCollected || 0),
        invoice: a.invoice ? { ...a.invoice, grandTotal: Number(a.invoice.grandTotal) } : null,
      })),
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getDataFromToken(req);
    if (!user || !user.labId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { phlebotomistId, scheduledDate, appointmentIds } = body;

    const trip = await prisma.homeCollectionTrip.create({
      data: {
        labId: user.labId,
        phlebotomistId,
        scheduledDate: new Date(scheduledDate),
      },
    });

    if (appointmentIds?.length) {
      await prisma.appointment.updateMany({
        where: { id: { in: appointmentIds } },
        data: { tripId: trip.id },
      });
    }

    return NextResponse.json({ success: true, trip });
  } catch (error) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
