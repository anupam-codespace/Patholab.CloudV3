import { NextRequest, NextResponse } from "next/server";
import { PrismaClient, Prisma } from "@prisma/client";
import { getDataFromToken } from "@/lib/auth";

const prisma = new PrismaClient();

// =========================================================================
// 1. GET: Fetch Online Bookings + Aggregate Stats + Portal Status
// =========================================================================
export async function GET(req: NextRequest) {
  try {
    const user = await getDataFromToken(req);
    if (!user || !user.labId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const formatParam = searchParams.get("format");

    // Fetch appointments made via ONLINE_PORTAL for this lab
    const appointments = await prisma.appointment.findMany({
      where: {
        labId: user.labId,
        source: "ONLINE_PORTAL",
      },
      include: {
        patient: {
          select: {
            id: true,
            patientId: true,
            name: true,
            phone: true,
            email: true,
            age: true,
            gender: true,
            address: true,
            pincode: true,
          },
        },
        tests: {
          select: {
            id: true,
            testName: true,
            testCode: true,
            price: true,
            status: true,
          },
        },
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            grandTotal: true,
            subtotal: true,
            totalTax: true,
            paymentStatus: true,
          },
        },
        branch: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Default for web: return raw appointments array
    if (formatParam !== "full") {
      return NextResponse.json(appointments);
    }

    // Calculate Quick Stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let totalRevenue = 0;
    let homeCollections = 0;
    let labVisits = 0;
    let totalPending = 0;
    let totalToday = 0;

    for (const appt of appointments) {
      if (appt.invoice?.grandTotal) {
        totalRevenue += Number(appt.invoice.grandTotal);
      }
      if (appt.collectionMode === "HOME_COLLECTION") {
        homeCollections++;
      } else {
        labVisits++;
      }
      if (appt.status === "SCHEDULED" || appt.status === "PENDING_PAYMENT") {
        totalPending++;
      }
      if (new Date(appt.createdAt) >= today) {
        totalToday++;
      }
    }

    // Portal Status
    const lab = await prisma.lab.findUnique({
      where: { id: user.labId },
      select: { portalSlug: true, name: true },
    });

    return NextResponse.json({
      success: true,
      appointments,
      stats: {
        totalCount: appointments.length,
        totalToday,
        totalPending,
        totalRevenue,
        homeCollections,
        labVisits,
      },
      portal: {
        portalSlug: lab?.portalSlug || null,
        isLive: !!lab?.portalSlug,
        url: lab?.portalSlug ? `https://portal.patholab.cloud/p/${lab.portalSlug}` : null,
      },
    });
  } catch (error: any) {
    console.error("Fetch Online Bookings Error:", error);
    return NextResponse.json({ error: "Failed to fetch bookings" }, { status: 500 });
  }
}

// =========================================================================
// 2. PATCH: Update Status, Reschedule, or Update Address
// =========================================================================
export async function PATCH(req: NextRequest) {
  try {
    const user = await getDataFromToken(req);
    if (!user || !user.labId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { appointmentId, status, appointmentDate, timeSlot, collectionAddress, pincode } = body;

    if (!appointmentId) {
      return NextResponse.json({ error: "appointmentId is required" }, { status: 400 });
    }

    // Verify appointment belongs to this lab
    const existing = await prisma.appointment.findFirst({
      where: {
        id: appointmentId,
        labId: user.labId,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Appointment not found or unauthorized" }, { status: 404 });
    }

    const updateData: any = {};

    if (status) {
      updateData.status = status;
    }
    if (appointmentDate) {
      updateData.appointmentDate = new Date(appointmentDate);
    }
    if (timeSlot !== undefined) {
      updateData.timeSlot = timeSlot;
    }
    if (collectionAddress !== undefined) {
      updateData.collectionAddress = collectionAddress;
    }
    if (pincode !== undefined) {
      updateData.pincode = pincode;
    }

    const updated = await prisma.appointment.update({
      where: { id: appointmentId },
      data: updateData,
      include: {
        patient: { select: { name: true, phone: true } },
        tests: { select: { testName: true } },
        invoice: { select: { grandTotal: true, paymentStatus: true } },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Appointment updated successfully",
      appointment: updated,
    });
  } catch (error: any) {
    console.error("Update Online Booking Error:", error);
    return NextResponse.json({ error: error.message || "Failed to update booking" }, { status: 500 });
  }
}

// =========================================================================
// 3. POST: Create In-App Online Booking
// =========================================================================
export async function POST(req: NextRequest) {
  try {
    const user = await getDataFromToken(req);
    if (!user || !user.labId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      name,
      phone,
      email,
      gender = "MALE",
      age,
      collectionType = "HOME_COLLECTION",
      address,
      pincode,
      scheduledDate,
      timeSlot,
      testIds = [],
      notes,
    } = body;

    if (!name || !phone) {
      return NextResponse.json({ error: "Patient name and phone are required" }, { status: 400 });
    }

    if (!scheduledDate) {
      return NextResponse.json({ error: "Scheduled date is required" }, { status: 400 });
    }

    // 1. Fetch Tests
    let templates: any[] = [];
    if (Array.isArray(testIds) && testIds.length > 0) {
      templates = await prisma.testTemplate.findMany({
        where: {
          id: { in: testIds },
          isActive: true,
        },
      });
    }

    let subtotal = 0;
    for (const t of templates) {
      subtotal += Number(t.price || 0);
    }
    const grandTotal = subtotal;

    const collectionMode = collectionType === "HOME_COLLECTION" ? "HOME_COLLECTION" : "LAB_VISIT";

    const labId: string = user.labId;
    const branchId: string | null = user.branchId || null;

    // 2. Atomic Transaction
    const result = await prisma.$transaction(async (tx) => {
      // Find or create patient
      let patient = await tx.patient.findFirst({
        where: {
          labId: labId,
          phone: phone.trim(),
        },
      });

      if (!patient) {
        patient = await tx.patient.create({
          data: {
            labId: labId,
            branchId: branchId,
            patientId: `PAT-${Date.now().toString().slice(-6)}`,
            name: name.trim(),
            phone: phone.trim(),
            email: email ? email.trim() : null,
            gender: gender as any,
            age: age ? parseInt(String(age), 10) : null,
            address: address || null,
            pincode: pincode || null,
          },
        });
      }

      // Create Invoice
      const invoice = await tx.invoice.create({
        data: {
          labId: labId,
          branchId: branchId,
          patientId: patient.id,
          invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
          subtotal: new Prisma.Decimal(subtotal),
          totalTax: new Prisma.Decimal(0),
          taxableAmount: new Prisma.Decimal(subtotal),
          grandTotal: new Prisma.Decimal(grandTotal),
          status: "PENDING",
          paymentStatus: "PENDING",
          items: {
            create: templates.map((t) => ({
              description: t.name,
              unitPrice: new Prisma.Decimal(Number(t.price || 0)),
              taxRate: new Prisma.Decimal(0),
              taxAmount: new Prisma.Decimal(0),
              total: new Prisma.Decimal(Number(t.price || 0)),
            })),
          },
        },
      });

      // Create Appointment
      const appointment = await tx.appointment.create({
        data: {
          labId: labId,
          branchId: branchId,
          patientId: patient.id,
          invoiceId: invoice.id,
          source: "ONLINE_PORTAL",
          collectionMode: collectionMode as any,
          collectionAddress: address || null,
          pincode: pincode || null,
          appointmentDate: new Date(scheduledDate),
          timeSlot: timeSlot || "08:00 AM - 10:00 AM",
          status: "SCHEDULED",
        },
      });

      // Create Tests
      if (templates.length > 0) {
        await tx.test.createMany({
          data: templates.map((t) => ({
            labId: labId,
            branchId: branchId,
            patientId: patient.id,
            appointmentId: appointment.id,
            invoiceId: invoice.id,
            testTemplateId: t.id,
            testName: t.name,
            testCode: t.code,
            testNumber: `TST-${Math.floor(10000 + Math.random() * 90000)}`,
            status: "PENDING",
            price: new Prisma.Decimal(Number(t.price || 0)),
            finalPrice: new Prisma.Decimal(Number(t.price || 0)),
          })),
        });
      }

      return { appointment, invoice, patient };
    });

    return NextResponse.json({
      success: true,
      message: "Online booking created successfully",
      appointmentId: result.appointment.id,
      invoiceId: result.invoice.id,
      patientId: result.patient.id,
      grandTotal,
    });
  } catch (error: any) {
    console.error("Create In-App Online Booking Error:", error);
    return NextResponse.json({ error: error.message || "Failed to create booking" }, { status: 500 });
  }
}