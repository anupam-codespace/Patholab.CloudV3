import { NextRequest, NextResponse } from "next/server";
import { PrismaClient, CollectionMode } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(
  req: NextRequest,
  { params }: { params: { portalSlug: string } }
) {
  try {
    const body = await req.json();
    const {
      name, email, phone, gender, dateOfBirth,
      testTemplateIds, // Array of test IDs selected
      collectionMode, address, pincode,
      appointmentDate, timeSlot
    } = body;

    // 1. Validate Lab via portalSlug
    const lab = await prisma.lab.findUnique({
      where: { portalSlug: params.portalSlug },
    });
    if (!lab) return NextResponse.json({ error: "Lab not found" }, { status: 404 });

    // 2. Fetch Selected Tests & Calculate Totals
    const templates = await prisma.testTemplate.findMany({
      where: { id: { in: testTemplateIds }, labId: lab.id }
    });
    
    let subtotal = 0;
    templates.forEach(t => { subtotal += Number(t.price); });
    const grandTotal = subtotal; // Add Tax/Delivery fee logic here if needed

    // 3. Determine Branch for Home Collection Logistics
    let assignedBranchId = null;
    if (collectionMode === "HOME_COLLECTION" && pincode) {
      const serviceArea = await prisma.serviceArea.findFirst({
        where: { labId: lab.id, pincode, isActive: true }
      });
      if (!serviceArea) {
        return NextResponse.json({ error: "Sorry, we do not service this pincode yet." }, { status: 400 });
      }
      assignedBranchId = serviceArea.branchId;
    }

    // 4. Massive Transaction: Create User -> Patient -> Invoice -> Appointment -> Tests
    const result = await prisma.$transaction(async (tx) => {
      
      // A. Find or Create User (Portal Login Account)
      let user = await tx.user.findFirst({ where: { phone } });
      if (!user) {
        user = await tx.user.create({
          data: {
            name, phone, email,
            password: "TEMPORARY_PASSWORD", // Should generate a random one and send via SMS
            role: "PATIENT",
            isActive: true,
          }
        });
      }

      // B. Find or Create Patient (Clinical Profile)
      let patient = await tx.patient.findFirst({ where: { labId: lab.id, phone } });
      if (!patient) {
        patient = await tx.patient.create({
          data: {
            labId: lab.id,
            branchId: assignedBranchId,
            userId: user.id,
            patientId: `PAT-${Date.now()}`, // Or use your custom ID generator
            name, phone, email, gender, address, pincode,
            dateOfBirth: new Date(dateOfBirth),
          }
        });
      }

      // C. Create Invoice (Pending Payment)
      const invoice = await tx.invoice.create({
        data: {
          labId: lab.id,
          branchId: assignedBranchId,
          patientId: patient.id,
          invoiceNumber: `INV-${Date.now()}`,
          subtotal,
          totalTax: 0,
          grandTotal,
          status: "PENDING",
          paymentStatus: "PENDING",
          items: {
            create: templates.map(t => ({
              description: t.name,
              unitPrice: t.price,
              taxRate: 0,
              taxAmount: 0,
              total: t.price
            }))
          }
        }
      });

      // D. Create Logistics Appointment
      const appointment = await tx.appointment.create({
        data: {
          labId: lab.id,
          branchId: assignedBranchId,
          patientId: patient.id,
          invoiceId: invoice.id,
          source: "ONLINE_PORTAL",
          collectionMode,
          collectionAddress: address,
          pincode,
          appointmentDate: new Date(appointmentDate),
          timeSlot,
          status: "PENDING_PAYMENT" // Waiting for payment gateway
        }
      });

      // E. Generate Clinical Test Records
      await tx.test.createMany({
        data: templates.map(t => ({
          labId: lab.id,
          branchId: assignedBranchId,
          patientId: patient.id,
          appointmentId: appointment.id,
          invoiceId: invoice.id,
          testTemplateId: t.id,
          testName: t.name,
          testCode: t.code,
          testNumber: `TST-${Math.floor(Math.random() * 100000)}`,
          status: "PENDING",
          price: t.price,
          finalPrice: t.price,
        }))
      });

      return { appointment, invoice };
    });

    return NextResponse.json({ 
      success: true, 
      appointmentId: result.appointment.id,
      invoiceId: result.invoice.id,
      payableAmount: grandTotal
    });

  } catch (error: any) {
    console.error("Booking Error:", error);
    return NextResponse.json({ error: "Booking Failed. Please try again." }, { status: 500 });
  }
}