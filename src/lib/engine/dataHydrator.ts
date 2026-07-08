import { prisma } from "@/lib/prisma";
import { format } from "date-fns";

export async function buildUniversalReportContext(invoiceId: string) {
  // 1. Fetch EVERYTHING related to this visit
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      lab: true,
      branch: true,
      patient: true,
      agency: true,
      tests: {
        include: {
          sample: true,
          doctor: { include: { user: true } },
          testTemplate: { include: { Department: true } },
          results: { orderBy: { order: 'asc' } },
          customResults: { include: { field: true } } // From your dynamic custom fields!
        }
      }
    }
  });

  if (!invoice) throw new Error("Invoice not found");

  const primaryTest = invoice.tests[0];
  const patient = invoice.patient!;
  const lab = invoice.lab;
  const branch = invoice.branch || lab; // Fallback to lab if no branch

  // 2. Build the Universal Dictionary
  // Every key here becomes a {{tag}} in your drag-and-drop builder
  return {
    lab: {
      name: lab.name,
      address: lab.address || "",
      city: lab.city || "",
      phone: lab.phone,
      email: lab.email,
      logo: lab.logo || "",
      signature: lab.signature || "",
      license: lab.licenseNumber || "",
      gst: lab.gstNumber || ""
    },
    branch: {
      name: branch.name,
      address: branch.address || "",
      phone: branch.phone || "",
    },
    patient: {
      id: patient.patientId,
      uhid: patient.abhaNumber || patient.patientId,
      name: patient.name,
      age: patient.age ? `${patient.age} ${patient.ageUnit}` : "-",
      gender: patient.gender || "-",
      phone: patient.phone,
      bloodGroup: patient.bloodGroup || "-",
      address: patient.address || "-",
    },
    logistics: {
      invoiceNo: invoice.invoiceNumber,
      barcode: primaryTest?.sample?.sampleId || patient.patientId,
      collectionMode: primaryTest?.sample?.collectionMode || "LAB_VISIT",
      referredBy: primaryTest?.doctor?.name || invoice.agency?.agencyName || "Self",
      collectedAt: primaryTest?.sampleCollectedAt ? format(primaryTest.sampleCollectedAt, "dd MMM yyyy, hh:mm a") : "-",
      receivedAt: primaryTest?.sampleReceivedAt ? format(primaryTest.sampleReceivedAt, "dd MMM yyyy, hh:mm a") : "-",
      reportedAt: primaryTest?.approvedAt ? format(primaryTest.approvedAt, "dd MMM yyyy, hh:mm a") : format(new Date(), "dd MMM yyyy, hh:mm a"),
    },
    // Group tests by Department automatically for tables
    departments: groupTestsByDepartment(invoice.tests),
    // Raw tests for advanced templating
    tests: invoice.tests.map(t => ({
      name: t.testName,
      method: t.method || "",
      results: t.results.map(r => ({
        parameter: r.printName || r.parameterName,
        value: r.textValue || r.numericValue || r.value,
        unit: r.unit || "",
        refRange: r.referenceRangeText || `${r.refRangeMin || ''} - ${r.refRangeMax || ''}`,
        flag: r.flag || "NORMAL",
        isAbnormal: r.flag === "HIGH" || r.flag === "LOW"
      })),
      customFields: t.customResults.map(cr => ({
        name: cr.field.name,
        value: cr.value
      }))
    })),
    system: {
      currentDate: format(new Date(), "dd MMM yyyy"),
      currentTime: format(new Date(), "hh:mm a"),
    }
  };
}

// Helper to group tests
function groupTestsByDepartment(tests: any[]) {
  const map: Record<string, any[]> = {};
  for (const test of tests) {
    const dept = test.testTemplate?.Department?.name || "GENERAL PATHOLOGY";
    if (!map[dept]) map[dept] = [];
    map[dept].push(test);
  }
  return Object.entries(map).map(([name, deptTests]) => ({ name, tests: deptTests }));
}