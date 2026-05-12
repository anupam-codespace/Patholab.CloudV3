import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    let test = null;
    let lab = null;

    // SMART SEARCH
    const report = await prisma.report.findUnique({ where: { id }, include: { test: { include: { lab: true } } } });
    if (report && report.test) { test = report.test; lab = report.test.lab; }

    if (!test) {
      test = await prisma.test.findUnique({ where: { id }, include: { lab: true } });
      if (test) lab = test.lab;
    }

    if (!test) {
      const patient = await prisma.patient.findUnique({ where: { id }, include: { tests: { take: 1, include: { lab: true } } } });
      if (patient && patient.tests.length > 0) { test = patient.tests[0]; lab = test.lab; }
    }

    if (!test) {
      const invoice = await prisma.invoice.findUnique({ where: { id }, include: { tests: { take: 1, include: { lab: true } } } });
      if (invoice && invoice.tests.length > 0) { test = invoice.tests[0]; lab = invoice.tests[0].lab; }
    }

    if (!test) {
      return NextResponse.json({ error: "No valid report found for this QR code." }, { status: 404 });
    }

    // 🔒 MASKED RETURN: We do NOT send patient name, age, or test details yet!
    return NextResponse.json({
      id: id,
      lab: {
        name: lab?.name || "Verified Laboratory",
        city: lab?.city || lab?.address || "Medical District",
      }
    });

  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}