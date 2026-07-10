import { NextRequest, NextResponse } from "next/server";
import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(
  req: NextRequest,
  { params }: { params: { portalSlug: string } }
) {
  try {
    const body = await req.json();
    const {
      name, email, phone, gender, dateOfBirth,
      testTemplateIds, collectionMode, address, pincode,
      appointmentDate, timeSlot
    } = body;

    // 1. Validate Lab
    const lab = await prisma.lab.findUnique({
      where: { portalSlug: params.portalSlug },
    });
    if (!lab) return NextResponse.json({ error: "Lab not found" }, { status: 404 });

    // 2. Fetch Tests & Financials
    const templates = await prisma.testTemplate.findMany({
      where: { id: { in: testTemplateIds }, labId: lab.id }
    });

    if (templates.length === 0) {
      return NextResponse.json({ error: "No valid tests selected" }, { status: 400 });
    }

    const subtotal = templates.reduce((acc, t) => acc + Number(t.price), 0);
    const tax = 0;
    const grandTotal = subtotal + tax;

    // 3. Logic for Logistics Branch
    let assignedBranchId: string | null = null;
    if (collectionMode === "HOME_COLLECTION" && pincode) {
      const serviceArea = await prisma.serviceArea.findFirst({
        where: { labId: lab.id, pincode, isActive: true }
      });
      if (!serviceArea) {
        return NextResponse.json({ error: "Sorry, we do not service this pincode yet." }, { status: 400 });
      }
      assignedBranchId = serviceArea.branchId;
    } else {
      // Use the lab's main branch for lab visits
      const mainBranch = await prisma.branch.findFirst({
        where: { labId: lab.id, isMainBranch: true }
      });
      assignedBranchId = mainBranch?.id || null;
    }

    // 4. Atomic Transaction
    const result = await prisma.$transaction(async (tx) => {

      // A. Create/Find User & Patient (use relation connect syntax for Prisma 6)
      let user = await tx.user.findFirst({ where: { phone } });
      if (!user) {
        user = await tx.user.create({
          data: {
            name,
            phone,
            email: email || null,
            password: "temp_" + Date.now(),
            role: "PATIENT",
            isActive: true,
            emailVerified: true,
          }
        });
      }

      let patient = await tx.patient.findFirst({ where: { labId: lab.id, phone } });
      if (!patient) {
        // Generate patient ID
        const patientCount = await tx.patient.count({ where: { labId: lab.id } });
        const patientId = `P-${String(patientCount + 1).padStart(5, '0')}`;

        patient = await tx.patient.create({
          data: {
            lab: { connect: { id: lab.id } },
            ...(assignedBranchId ? { branch: { connect: { id: assignedBranchId } } } : {}),
            user: { connect: { id: user.id } },
            patientId,
            name,
            phone,
            email: email || null,
            gender: gender || "OTHER",
            address: address || null,
            pincode: pincode || null,
            dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
          }
        });
      }

      // B. Create Invoice (use relation connect syntax)
      const invoiceCount = await tx.invoice.count({ where: { labId: lab.id } });
      const invoiceNumber = `INV-${Date.now()}-${invoiceCount + 1}`;

      const invoice = await tx.invoice.create({
        data: {
          lab: { connect: { id: lab.id } },
          ...(assignedBranchId ? { branch: { connect: { id: assignedBranchId } } } : {}),
          patient: { connect: { id: patient.id } },
          invoiceNumber,
          subtotal: new Prisma.Decimal(subtotal),
          totalTax: new Prisma.Decimal(tax),
          grandTotal: new Prisma.Decimal(grandTotal),
          taxableAmount: new Prisma.Decimal(subtotal),
          status: "PENDING",
          paymentStatus: "PENDING",
          items: {
            create: templates.map(t => ({
              description: t.name,
              unitPrice: new Prisma.Decimal(t.price),
              taxRate: new Prisma.Decimal(0),
              taxAmount: new Prisma.Decimal(0),
              total: new Prisma.Decimal(t.price)
            }))
          }
        }
      });

      // C. Create Appointment — Appointment model has scalar labId (no lab relation)
      const appointment = await tx.appointment.create({
        data: {
          labId: lab.id,
          ...(assignedBranchId ? { branch: { connect: { id: assignedBranchId } } } : {}),
          patient: { connect: { id: patient.id } },
          invoice: { connect: { id: invoice.id } },
          source: "ONLINE_PORTAL",
          collectionMode,
          collectionAddress: address || null,
          pincode: pincode || null,
          appointmentDate: new Date(appointmentDate),
          timeSlot: timeSlot || null,
          status: "PENDING_PAYMENT"
        }
      });

      // D. Generate Tests (use relation connect syntax)
      for (const t of templates) {
        const testCount = await tx.test.count({ where: { labId: lab.id } });
        await tx.test.create({
          data: {
            lab: { connect: { id: lab.id } },
            ...(assignedBranchId ? { branch: { connect: { id: assignedBranchId } } } : {}),
            patient: { connect: { id: patient.id } },
            appointment: { connect: { id: appointment.id } },
            invoice: { connect: { id: invoice.id } },
            testTemplate: { connect: { id: t.id } },
            testName: t.name,
            testCode: t.code,
            testNumber: `TST-${String(testCount + 1).padStart(5, '0')}`,
            status: "PENDING",
            price: t.price,
            finalPrice: t.price,
          }
        });
      }

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
    return NextResponse.json(
      { error: "Booking Failed: " + (error.message || "Please try again.") },
      { status: 500 }
    );
  }
}
