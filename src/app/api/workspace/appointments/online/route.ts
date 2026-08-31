import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDataFromToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

// ============================================================================
// GET: Fetch only appointments made via the public portal
// Returns trackId, paymentVerified, paymentVerifiedAt, and full test list
// so the lab owner can verify payments and view tracking.
// ============================================================================
export async function GET(req: NextRequest) {
  try {
    const user = await getDataFromToken(req);
    if (!user || !user.labId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const appointments = await prisma.appointment.findMany({
      where: {
        labId: user.labId,
        source: "ONLINE_PORTAL",
      },
      include: {
        patient: {
          select: { id: true, name: true, phone: true, patientId: true },
        },
        tests: {
          select: {
            id: true,
            testName: true,
            testCode: true,
            status: true,
            finalPrice: true,
          },
        },
        invoice: {
          select: {
            id: true,
            grandTotal: true,
            paymentStatus: true,
            invoiceNumber: true,
          },
        },
        branch: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // Serialize all Decimal amounts as numbers (Prisma Decimal → JS Number)
    const serialized = appointments.map((a) => ({
      id: a.id,
      trackId: a.trackId,
      status: a.status,
      collectionMode: a.collectionMode,
      appointmentDate: a.appointmentDate,
      timeSlot: a.timeSlot,
      paymentVerified: a.paymentVerified,
      paymentVerifiedAt: a.paymentVerifiedAt,
      paymentVerifiedBy: a.paymentVerifiedBy,
      createdAt: a.createdAt,
      patient: a.patient,
      tests: a.tests.map((t) => ({
        ...t,
        finalPrice: Number(t.finalPrice || 0),
      })),
      invoice: a.invoice
        ? {
            ...a.invoice,
            grandTotal: Number(a.invoice.grandTotal || 0),
          }
        : null,
      branch: a.branch,
    }));

    return NextResponse.json(serialized);
  } catch (error: any) {
    console.error("[ONLINE_BOOKINGS_GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch bookings" },
      { status: 500 }
    );
  }
}
