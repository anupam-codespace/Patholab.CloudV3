import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;

    let test = null;
    let patient = null;
    let lab = null;

    // 1. SMART SEARCH: Try Report ID (This is what the Dispatch Page generates)
    const report = await prisma.report.findUnique({
      where: { id },
      include: { test: { include: { lab: true, patient: true } } }
    });
    if (report && report.test) {
      test = report.test;
      patient = report.test.patient;
      lab = report.test.lab;
    }

    // 2. SMART SEARCH: Try Test ID
    if (!test) {
      test = await prisma.test.findUnique({
        where: { id },
        include: { lab: true, patient: true }
      });
      if (test) {
        patient = test.patient;
        lab = test.lab;
      }
    }

    // 3. SMART SEARCH: Try Patient ID
    if (!test) {
      patient = await prisma.patient.findUnique({
        where: { id },
        include: { tests: { take: 1, orderBy: { createdAt: 'desc' }, include: { lab: true } } }
      });
      if (patient && patient.tests.length > 0) {
        test = patient.tests[0];
        lab = test.lab;
      }
    }

    // 4. SMART SEARCH: Try Invoice ID
    if (!test) {
      const invoice = await prisma.invoice.findUnique({
        where: { id },
        include: { tests: { take: 1, include: { lab: true, patient: true } } }
      });
      if (invoice && invoice.tests.length > 0) {
        test = invoice.tests[0];
        patient = invoice.tests[0].patient;
        lab = invoice.tests[0].lab;
      }
    }

    // If no test or patient data is found across any table, reject the verification
    if (!test || !patient) {
      return NextResponse.json({ error: "No valid report found for this QR code." }, { status: 404 });
    }

    // Return the safe, sanitized payload to the public verification screen
    return NextResponse.json({
      id: id, 
      patient: {
        name: patient.name,
        patientId: patient.patientId,
        age: patient.age,
        ageUnit: patient.ageUnit,
        gender: patient.gender,
      },
      lab: {
        name: lab?.name || "Verified Laboratory",
        city: lab?.city || lab?.address || "Medical District",
      },
      test: {
        testName: test.testName || "Clinical Report",
        approvedAt: test.approvedAt || test.createdAt,
      }
    });

  } catch (error) {
    console.error("Verification API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}