import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolvePublicLabId } from "@/lib/public-lab";

export async function POST(
  req: NextRequest,
  { params }: { params: { portalSlug: string } },
) {
  try {
    const body = await req.json();
    const {
      name,
      phone,
      gender,
      dateOfBirth,
      collectionMode,
      address,
      pincode,
      appointmentDate,
      timeSlot,
      testTemplateIds,
      transactionId,
    } = body;

    if (!name || !phone || !gender || !appointmentDate || !timeSlot || !testTemplateIds?.length) {
      return NextResponse.json({ error: "Missing required booking details." }, { status: 400 });
    }

    if (!["HOME_COLLECTION", "LAB_VISIT"].includes(collectionMode)) {
      return NextResponse.json({ error: "Invalid collection mode selected." }, { status: 400 });
    }

    if (collectionMode === "HOME_COLLECTION") {
      if (!address || address.trim().length < 10) {
        return NextResponse.json(
          { error: "A detailed address (minimum 10 characters) is required for Home Collection." },
          { status: 400 },
        );
      }

      if (!/^[1-9][0-9]{5}$/.test(pincode || "")) {
        return NextResponse.json({ error: "Please enter a valid 6-digit pincode." }, { status: 400 });
      }

      if (!transactionId?.trim()) {
        return NextResponse.json(
          { error: "Payment transaction ID / UTR is required." },
          { status: 400 },
        );
      }
    }

    const requestedDate = new Date(appointmentDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (isNaN(requestedDate.getTime())) {
      return NextResponse.json({ error: "Invalid date format." }, { status: 400 });
    }

    if (requestedDate < today) {
      return NextResponse.json({ error: "Appointments cannot be booked in the past." }, { status: 400 });
    }

    const labId = await resolvePublicLabId(params.portalSlug);
    const lab = labId
      ? await prisma.lab.findFirst({ where: { id: labId, isActive: true } })
      : null;

    if (!lab) {
      return NextResponse.json({ error: "Lab not found or inactive." }, { status: 404 });
    }

    if (collectionMode === "HOME_COLLECTION" && !lab.upiQrCode) {
      return NextResponse.json(
        { error: "This lab has not configured UPI payment yet." },
        { status: 400 },
      );
    }

    const uniqueTemplateIds = Array.from(new Set(testTemplateIds));
    const templates = await prisma.testTemplate.findMany({
      where: { id: { in: uniqueTemplateIds }, labId: lab.id, isActive: true },
      select: { id: true, name: true, code: true, price: true, testCategoryId: true },
    });

    if (templates.length !== uniqueTemplateIds.length) {
      return NextResponse.json(
        { error: "One or more selected tests are invalid or inactive." },
        { status: 400 },
      );
    }

    const totalAmount = templates.reduce((sum, test) => sum + Number(test.price || 0), 0);

    let assignedBranchId: string | null = null;
    if (collectionMode === "HOME_COLLECTION") {
      const serviceArea = await prisma.serviceArea.findFirst({
        where: { labId: lab.id, pincode, isActive: true },
      });

      if (!serviceArea) {
        return NextResponse.json(
          { error: `Sorry, we currently do not offer home collection at pincode ${pincode}. Please select 'Visit Laboratory'.` },
          { status: 400 },
        );
      }

      assignedBranchId = serviceArea.branchId;
    } else {
      const mainBranch = await prisma.branch.findFirst({
        where: { labId: lab.id, isMainBranch: true },
      });
      assignedBranchId = mainBranch?.id || null;
    }

    let validDob: Date | null = null;
    if (dateOfBirth) {
      const parsedDate = new Date(dateOfBirth);
      if (!isNaN(parsedDate.getTime())) validDob = parsedDate;
    }

    let patient = await prisma.patient.findFirst({
      where: { phone, labId: lab.id },
    });

    if (!patient) {
      patient = await prisma.patient.create({
        data: {
          labId: lab.id,
          patientId: `PAT-${Math.floor(100000 + Math.random() * 900000)}`,
          name,
          phone,
          gender,
          dateOfBirth: validDob,
          address: collectionMode === "HOME_COLLECTION" ? address : null,
          pincode: collectionMode === "HOME_COLLECTION" ? pincode : null,
        },
      });
    }

    const invoice = await prisma.invoice.create({
      data: {
        labId: lab.id,
        branchId: assignedBranchId,
        patientId: patient.id,
        invoiceNumber: `INV-${Date.now().toString().slice(-8)}`,
        subtotal: totalAmount,
        taxableAmount: totalAmount,
        totalTax: 0,
        grandTotal: totalAmount,
        paymentStatus: collectionMode === "HOME_COLLECTION" ? "PENDING" : "PENDING",
        paymentMode: collectionMode === "HOME_COLLECTION" ? "UPI" : null,
        transactionRef: collectionMode === "HOME_COLLECTION" ? transactionId.trim() : null,
        status: "PENDING",
        isB2B: false,
        items: {
          create: templates.map((template) => ({
            description: template.name,
            unitPrice: Number(template.price || 0),
            quantity: 1,
            discount: 0,
            taxRate: 0,
            taxAmount: 0,
            total: Number(template.price || 0),
          })),
        },
      },
    });

    const appointment = await prisma.appointment.create({
      data: {
        labId: lab.id,
        branchId: assignedBranchId,
        patientId: patient.id,
        source: "ONLINE_PORTAL",
        collectionMode,
        appointmentDate: requestedDate,
        timeSlot,
        collectionAddress: collectionMode === "HOME_COLLECTION" ? address : null,
        pincode: collectionMode === "HOME_COLLECTION" ? pincode : null,
        invoiceId: invoice.id,
        status: collectionMode === "HOME_COLLECTION" ? "PENDING_PAYMENT" : "SCHEDULED",
        paymentMode: collectionMode === "HOME_COLLECTION" ? "UPI" : null,
        paymentCollected: collectionMode === "HOME_COLLECTION" ? totalAmount : 0,
        transactionId: collectionMode === "HOME_COLLECTION" ? transactionId.trim() : null,
        receiptUrl: null,
        tests: {
          create: templates.map((template, index) => ({
            labId: lab.id,
            branchId: assignedBranchId,
            patientId: patient.id,
            testTemplateId: template.id,
            testName: template.name,
            testCode: template.code,
            categoryId: template.testCategoryId,
            testNumber: `T-${Date.now()}-${index}-${Math.floor(Math.random() * 1000)}`,
            price: Number(template.price || 0),
            finalPrice: Number(template.price || 0),
            invoiceId: invoice.id,
          })),
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Request received. Payment proof is pending lab verification.",
      appointmentId: appointment.id,
    });
  } catch (error) {
    console.error("Public Booking Error:", error);
    return NextResponse.json({ error: "Failed to process booking. Please try again." }, { status: 500 });
  }
}
