import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// ==========================================
// REQUEST SCHEMA (Improvement #8 — Zod validation)
// ==========================================
const ActionSchema = z.object({
  appointmentId: z.string().min(1, "appointmentId is required."),
  action: z.enum(["APPROVE", "REJECT", "COLLECT"], {
    errorMap: () => ({ message: "action must be one of: APPROVE, REJECT, COLLECT" }),
  }),
  phlebotomistId: z.string().optional(),
  rejectReason: z.string().optional(),
});

// ==========================================
// HANDLER: APPROVE & DISPATCH (Improvement #7 — extracted function)
// ==========================================
async function handleApprove(
  appointment: any,
  phlebotomistId: string | undefined,
  admin: any,
  labId: string
) {
  // Improvement #1 (mode guard already enforced before this call)
  if (!phlebotomistId) {
    return NextResponse.json({ error: "phlebotomistId is required for APPROVE." }, { status: 400 });
  }
  if (appointment.tripId || !["SCHEDULED", "PENDING_PAYMENT"].includes(appointment.status)) {
    return NextResponse.json({ error: "This request is no longer available for approval." }, { status: 409 });
  }

  if (appointment.status === "PENDING_PAYMENT" && !appointment.transactionId) {
    return NextResponse.json({ error: "Payment transaction ID is required before approval." }, { status: 400 });
  }

  // Improvement #4 — fetch phlebotomist name for the audit log
  const phlebotomist = await prisma.user.findFirst({
    where: {
      id: phlebotomistId,
      role: "PHLEBOTOMIST",
      isActive: true,
      staffLabs: { some: { labId, isActive: true } },
    },
    select: { id: true, name: true },
  });
  if (!phlebotomist) {
    return NextResponse.json({ error: "Invalid or inactive phlebotomist." }, { status: 400 });
  }

  // Improvement #5 — resolve branch name instead of hardcoding "Main Lab"
  let startLocation = "Main Lab";
  if (admin.branchId) {
    const branch = await prisma.branch.findUnique({
      where: { id: admin.branchId },
      select: { name: true },
    });
    if (branch) startLocation = branch.name;
  }

  await prisma.$transaction(async (tx) => {
    // 1. Create the Trip
    const trip = await tx.homeCollectionTrip.create({
      data: {
        labId,
        phlebotomistId: phlebotomist.id,
        scheduledDate: appointment.appointmentDate,
        startLocation,
        status: "SCHEDULED",
      },
    });

    // 2. Update Appointment to ASSIGNED
    await tx.appointment.update({
      where: { id: appointment.id },
      data: { tripId: trip.id, status: "ASSIGNED" },
    });

    if (appointment.invoiceId) {
      await tx.invoice.update({
        where: { id: appointment.invoiceId },
        data: {
          status: "PAID",
          paymentStatus: "PAID",
          paymentMode: "UPI",
          transactionRef: appointment.transactionId,
        },
      });
    }

    // 3. Audit Log
    await tx.activityLog.create({
      data: {
        labId,
        userId: admin.id!,
        action: "APPROVED_HOME_COLLECTION",
        entity: "APPOINTMENT",
        entityId: appointment.id,
        entityType: "APPOINTMENT",
        description: `Approved and assigned to phlebotomist: ${phlebotomist.name || "Unknown"}`,
      },
    });
  });

  return NextResponse.json({ success: true, message: "Approved & Dispatched!" });
}

// ==========================================
// HANDLER: REJECT & REFUND (Improvement #7)
// ==========================================
async function handleReject(
  appointment: any,
  rejectReason: string | undefined,
  admin: any,
  labId: string
) {
  if (!rejectReason?.trim()) {
    return NextResponse.json({ error: "A rejection reason is required." }, { status: 400 });
  }

  // Improvement #6 — block rejection after dispatch (ASSIGNED, EN_ROUTE, etc.)
  const nonRejectableStatuses = [
    "CANCELLED",
    "COMPLETED",
    "ASSIGNED",
    "EN_ROUTE",
    "ARRIVED",
    "SAMPLE_COLLECTED",
    "RECEIVED_AT_LAB",
    "RESULT_ENTERED",
  ];
  if (appointment.tripId || nonRejectableStatuses.includes(appointment.status)) {
    return NextResponse.json(
      { error: `Cannot reject an appointment in '${appointment.status}' status.` },
      { status: 409 }
    );
  }

  await prisma.$transaction(async (tx) => {
    // 1. Cancel the Appointment
    await tx.appointment.update({
      where: { id: appointment.id },
      data: { status: "CANCELLED" },
    });

    // Payment-gateway refunds must be processed separately.
    await tx.activityLog.create({
      data: {
        labId,
        userId: admin.id!,
        action: "REJECTED_HOME_COLLECTION",
        entity: "APPOINTMENT",
        entityId: appointment.id,
        entityType: "APPOINTMENT",
        description: `Rejected: ${rejectReason}`,
      },
    });
  });

  return NextResponse.json({ success: true, message: "Request rejected." });
}

// ==========================================
// HANDLER: COLLECT SAMPLE (Improvement #7)
// ==========================================
async function handleCollect(appointment: any, admin: any, labId: string) {
  // Improvement #2 — proper status guards for each collection mode
  if (appointment.collectionMode === "LAB_VISIT") {
    if (appointment.status !== "SCHEDULED") {
      return NextResponse.json(
        { error: "Lab Visit must be in SCHEDULED status to collect." },
        { status: 409 }
      );
    }
  } else if (appointment.collectionMode === "HOME_COLLECTION") {
    if (appointment.status !== "SAMPLE_COLLECTED") {
      return NextResponse.json(
        { error: "Home Collection sample must be collected in the field first (status must be SAMPLE_COLLECTED)." },
        { status: 409 }
      );
    }
  } else {
    return NextResponse.json(
      { error: "Invalid collection mode for COLLECT action." },
      { status: 400 }
    );
  }

  await prisma.$transaction(async (tx) => {
    // 1. Advance to RECEIVED_AT_LAB (lab confirmed receipt)
    await tx.appointment.update({
      where: { id: appointment.id },
      data: { status: "RECEIVED_AT_LAB" },
    });

    // 2. Audit Log
    await tx.activityLog.create({
      data: {
        labId,
        userId: admin.id!,
        action: "SAMPLE_COLLECTED_AT_LAB",
        entity: "APPOINTMENT",
        entityId: appointment.id,
        entityType: "APPOINTMENT",
        description: `Sample received at lab by ${admin.name || "Admin"}.`,
      },
    });
  });

  return NextResponse.json({ success: true, message: "Sample marked as received at lab!" });
}

// ==========================================
// MAIN ROUTE HANDLER
// ==========================================
export async function PATCH(req: NextRequest) {
  try {
    const admin = await getCurrentUser();

    if (!admin || !admin.labId || !["LAB_OWNER", "LAB_MANAGER", "SUPER_ADMIN"].includes(admin.role)) {
      return NextResponse.json({ error: "Unauthorized. Managers only." }, { status: 403 });
    }
    const labId = admin.labId!;

    // Improvement #8 — validate request body with Zod
    const parseResult = ActionSchema.safeParse(await req.json());
    if (!parseResult.success) {
      const firstError = parseResult.error.errors[0]?.message ?? "Invalid request body.";
      return NextResponse.json({ error: firstError }, { status: 400 });
    }
    const { appointmentId, action, phlebotomistId, rejectReason } = parseResult.data;

    const appointment = await prisma.appointment.findFirst({
      where: { id: appointmentId, labId },
      include: { patient: true, invoice: true },
    });

    if (!appointment) {
      return NextResponse.json({ error: "Booking not found." }, { status: 404 });
    }

    // Route to the correct handler
    if (action === "APPROVE") {
      if (appointment.collectionMode !== "HOME_COLLECTION") {
        return NextResponse.json({ error: "APPROVE is only for Home Collections." }, { status: 400 });
      }
      return handleApprove(appointment, phlebotomistId, admin, labId);
    }

    if (action === "REJECT") {
      return handleReject(appointment, rejectReason, admin, labId);
    }

    if (action === "COLLECT") {
      return handleCollect(appointment, admin, labId);
    }

    return NextResponse.json({ error: "Invalid action." }, { status: 400 });

  } catch (error: any) {
    // Improvement #3 — always log the full error in the server console
    console.error("[APPOINTMENT_ACTION] Unhandled error:", error);
    return NextResponse.json(
      { error: error.message ?? "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
