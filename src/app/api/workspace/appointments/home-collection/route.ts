import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// ==========================================
// GET: Fetch Home Collections for the Dashboard
// ==========================================
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.labId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const appointments = await prisma.appointment.findMany({
      where: { 
        labId: user.labId, 
        collectionMode: "HOME_COLLECTION",
        tripId: null, // 🚀 FIX ISSUE #6: ONLY fetch unassigned requests
        status: { 
          notIn: ["CANCELLED", "COMPLETED", "RESULT_ENTERED", "RECEIVED_AT_LAB"] 
        }
      },
      include: {
        patient: { select: { name: true, phone: true, gender: true, address: true, pincode: true } },
        invoice: { select: { invoiceNumber: true, grandTotal: true, paymentStatus: true } },
        trip: true,
      },
      orderBy: { appointmentDate: "desc" },
      // Notice: 'take: 50' is removed so active queue is never truncated!
    });
    return NextResponse.json({ success: true, appointments });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch collections" }, { status: 500 });
  }
}

// ==========================================
// POST: Book a New Home Collection (Admin/Receptionist)
// ==========================================
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.labId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { 
      patientId, appointmentDate, timeSlot, 
      collectionAddress, pincode, source = "ONLINE_PORTAL",
      testTemplateIds // 🚀 FIX ISSUE #1: Now expecting tests from the frontend
    } = body;

    // 1. Basic Validation
    if (!patientId || !appointmentDate || !collectionAddress || !pincode || !timeSlot) {
      return NextResponse.json({ error: "Missing required fields for Home Collection." }, { status: 400 });
    }

    if (!testTemplateIds || !Array.isArray(testTemplateIds) || testTemplateIds.length === 0) {
      return NextResponse.json({ error: "Please select at least one test." }, { status: 400 });
    }

    // 2. Strict Server-Side Validation
    const isValidPincode = /^\d{6}$/.test(pincode);
    const isValidDate = !isNaN(Date.parse(appointmentDate)) && new Date(appointmentDate) >= new Date(new Date().setHours(0, 0, 0, 0));
    
    if (!isValidPincode) return NextResponse.json({ error: "Invalid 6-digit pincode." }, { status: 400 });
    if (!isValidDate) return NextResponse.json({ error: "Date cannot be in the past or invalid." }, { status: 400 });

    // 3. Verify Patient Exists (Looks for UUID OR Phone Number)
    const patient = await prisma.patient.findFirst({
      where: {
        labId: user.labId,
        OR: [
          { id: patientId },           // If it IS a UUID
          { phone: patientId },        // If they typed a phone number
        ]
      }
    });

    if (!patient) {
      return NextResponse.json({ error: "Patient not found. Please check the Phone Number or ID." }, { status: 404 });
    }

    // 4. Fetch Tests and Calculate Invoice Total
    const templates = await prisma.testTemplate.findMany({
      where: { id: { in: testTemplateIds }, labId: user.labId, isActive: true },
      select: { id: true, name: true, code: true, price: true, testCategoryId: true },
    });

    if (templates.length !== new Set(testTemplateIds).size) {
      return NextResponse.json({ error: "One or more selected tests are invalid or inactive." }, { status: 400 });
    }

    const totalAmount = templates.reduce((sum, test) => sum + (test.price ? Number(test.price) : 0), 0);

    // 5. Create the Appointment + Tests + Invoice in one transaction
    // Note: `data` is cast to `any` due to a known Prisma union type limitation when mixing scalar FKs
    // with nested relation creates (AppointmentCreateInput vs AppointmentUncheckedCreateInput).
    const appointment = await prisma.appointment.create({
      data: {
        labId: user.labId,
        patientId: patient.id,
        collectionMode: "HOME_COLLECTION",
        source: source,
        status: "SCHEDULED",
        appointmentDate: new Date(appointmentDate),
        timeSlot: timeSlot,
        collectionAddress: collectionAddress,
        pincode: pincode,
        branchId: user.branchId || null,

        // Attach Tests
        tests: {
          create: templates.map((template, index) => ({
            labId: user.labId,
            branchId: user.branchId || null,
            patientId: patient.id,
            testTemplateId: template.id,
            testName: template.name,
            testCode: template.code,
            categoryId: template.testCategoryId,
            testNumber: `T-${Date.now()}-${index}-${Math.floor(Math.random() * 1000)}`,
            price: template.price ? Number(template.price) : 0,
            finalPrice: template.price ? Number(template.price) : 0,
          })),
        },

        // Auto-generate the unpaid Invoice
        invoice: {
          create: {
            labId: user.labId,
            patientId: patient.id,
            invoiceNumber: `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            subtotal: totalAmount,
            taxableAmount: totalAmount,
            totalTax: 0,
            grandTotal: totalAmount,
            status: "PENDING",
            paymentStatus: "PENDING",
          },
        },
      } as any,
      include: {
        patient: { select: { name: true, phone: true } },
        tests: true,
        invoice: true,
      },
    });

    return NextResponse.json({ 
      success: true, 
      message: "Home collection booked successfully!",
      appointment 
    });

  } catch (error: any) {
    console.error("Home Collection Booking Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to book home collection." }, 
      { status: 500 }
    );
  }
}
