import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const body = await req.json();
    const inputPhone = body.phone || "";

    let test = null;
    let patient = null;
    let lab = null;

    // SMART SEARCH
    const report = await prisma.report.findUnique({ where: { id }, include: { test: { include: { lab: true, patient: true } } } });
    if (report && report.test) { test = report.test; patient = report.test.patient; lab = report.test.lab; }

    if (!test) {
      test = await prisma.test.findUnique({ where: { id }, include: { lab: true, patient: true } });
      if (test) { patient = test.patient; lab = test.lab; }
    }

    if (!test) {
      patient = await prisma.patient.findUnique({ where: { id }, include: { tests: { take: 1, include: { lab: true } } } });
      if (patient && patient.tests.length > 0) { test = patient.tests[0]; lab = test.lab; }
    }

    if (!test || !patient) return NextResponse.json({ error: "Report not found." }, { status: 404 });

    // 🔒 STRICT PHONE VERIFICATION
    // Strip everything except numbers, and grab the last 10 digits
    const dbPhoneClean = (patient.phone || "").replace(/\D/g, '').slice(-10);
    const inputPhoneClean = inputPhone.replace(/\D/g, '').slice(-10);

    if (dbPhoneClean !== inputPhoneClean) {
      return NextResponse.json({ error: "Incorrect mobile number." }, { status: 401 });
    }

    // 🔓 UNLOCKED RETURN: Phone matches! Send the full data.
    return NextResponse.json({
      id: id, 
      patient: { name: patient.name, patientId: patient.patientId, age: patient.age, ageUnit: patient.ageUnit, gender: patient.gender, phone: patient.phone },
      lab: { name: lab?.name || "Verified Laboratory", city: lab?.city || lab?.address || "Medical District" },
      test: { testName: test.testName || "Clinical Report", approvedAt: test.approvedAt || test.createdAt }
    });

  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}