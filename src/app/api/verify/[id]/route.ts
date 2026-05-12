import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;

    // 1. Try to find it as a specific TEST ID
    const test = await prisma.test.findUnique({
      where: { id },
      select: {
        id: true,
        testName: true,
        approvedAt: true,
        status: true,
        lab: { select: { name: true, city: true, phone: true, email: true } },
        patient: { select: { name: true, age: true, ageUnit: true, gender: true, patientId: true } }
      }
    });

    if (test) {
      return NextResponse.json({
        id: test.id,
        lab: test.lab,
        patient: test.patient,
        test: { testName: test.testName, approvedAt: test.approvedAt }
      }, { status: 200 });
    }

    // 2. Try to find it as a PATIENT ID (Returns their latest test)
    const patient = await prisma.patient.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        age: true,
        ageUnit: true,
        gender: true,
        patientId: true,
        lab: { select: { name: true, city: true, phone: true, email: true } },
        tests: { 
          select: { testName: true, approvedAt: true },
          take: 1, // Just grab the primary test for the verification display
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (patient) {
      return NextResponse.json({
        id: patient.id,
        lab: patient.lab,
        patient: { name: patient.name, age: patient.age, ageUnit: patient.ageUnit, gender: patient.gender, patientId: patient.patientId },
        test: patient.tests[0] || { testName: "Laboratory Report", approvedAt: new Date() }
      }, { status: 200 });
    }

    // 3. Try to find it as an INVOICE / ORDER ID
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      select: {
        id: true,
        patient: { select: { name: true, age: true, ageUnit: true, gender: true, patientId: true } },
        lab: { select: { name: true, city: true, phone: true, email: true } },
        tests: { select: { testName: true, approvedAt: true }, take: 1 }
      }
    });

    if (invoice) {
       return NextResponse.json({
        id: invoice.id,
        lab: invoice.lab,
        patient: invoice.patient,
        test: invoice.tests[0] || { testName: "Laboratory Report", approvedAt: new Date() }
      }, { status: 200 });
    }

    // If it's not in any of those tables, the QR code is genuinely invalid.
    return NextResponse.json({ error: "Report not found or invalid QR code." }, { status: 404 });
    
  } catch (error) {
    console.error("Verify API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}