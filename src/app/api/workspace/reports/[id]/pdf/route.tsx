import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToStream,
} from "@react-pdf/renderer";

export const dynamic = "force-dynamic";

// --- 1. DEFINE THE PDF STYLING ---
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: "#1e293b",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 2,
    borderBottomColor: "#3b82f6",
    paddingBottom: 15,
    marginBottom: 20,
  },
  labName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1e3a8a",
    marginBottom: 4,
  },
  labText: { fontSize: 9, color: "#64748b", marginBottom: 2 },
  title: {
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 15,
    textTransform: "uppercase",
    letterSpacing: 1,
  },

  patientBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#f8fafc",
    padding: 15,
    borderRadius: 6,
    marginBottom: 25,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  infoCol: { flexDirection: "column", gap: 4 },
  label: { fontWeight: "bold", color: "#64748b", fontSize: 8 },
  value: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#0f172a",
    marginBottom: 8,
  },

  table: { width: "100%", marginBottom: 30 },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#cbd5e1",
    fontWeight: "bold",
  },
  tableRow: {
    flexDirection: "row",
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f8fafc",
  },
  colParam: { width: "40%" },
  colResult: { width: "20%", fontWeight: "bold" },
  colUnit: { width: "15%", color: "#64748b" },
  colRef: { width: "25%", color: "#64748b" },

  flagHigh: { color: "#dc2626" },
  flagLow: { color: "#2563eb" },

  footer: { position: "absolute", bottom: 40, left: 40, right: 40 },
  signatureBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 50,
  },
  signLine: {
    width: 150,
    borderTopWidth: 1,
    borderTopColor: "#94a3b8",
    paddingTop: 5,
    textAlign: "center",
    fontSize: 9,
    fontWeight: "bold",
  },
  footerText: {
    textAlign: "center",
    color: "#94a3b8",
    fontSize: 8,
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingTop: 10,
  },
});

// --- 2. DEFINE THE PDF TEMPLATE ---
const MedicalReportPDF = ({ report, test, lab, patient }: any) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* HEADER SECTION */}
      <View style={styles.header}>
        <View>
          <Text style={styles.labName}>{lab.name}</Text>
          <Text style={styles.labText}>
            {lab.address}, {lab.city}, {lab.state} - {lab.pincode}
          </Text>
          <Text style={styles.labText}>
            Phone: {lab.phone} | Email: {lab.email}
          </Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={styles.labText}>License No: {lab.licenseNumber}</Text>
          <Text style={styles.labText}>GSTIN: {lab.gstNumber || "N/A"}</Text>
        </View>
      </View>

      <Text style={styles.title}>{test.testName} Report</Text>

      {/* PATIENT INFO SECTION */}
      <View style={styles.patientBox}>
        <View style={styles.infoCol}>
          <Text style={styles.label}>PATIENT NAME</Text>
          <Text style={styles.value}>{patient.name}</Text>
          <Text style={styles.label}>AGE / GENDER</Text>
          <Text style={styles.value}>
            {patient.age} {patient.ageUnit} / {patient.gender}
          </Text>
        </View>
        <View style={styles.infoCol}>
          <Text style={styles.label}>PATIENT ID (UHID)</Text>
          <Text style={styles.value}>{patient.patientId}</Text>
          <Text style={styles.label}>SAMPLE ID (SID)</Text>
          <Text style={styles.value}>{test.testNumber}</Text>
        </View>
        <View style={styles.infoCol}>
          <Text style={styles.label}>REFERRED BY</Text>
          <Text style={styles.value}>
            {test.doctor?.name || test.referredBy || "Self"}
          </Text>
          <Text style={styles.label}>DATE COLLECTED</Text>
          <Text style={styles.value}>
            {new Date(
              test.sampleCollectedAt || report.createdAt,
            ).toLocaleDateString()}
          </Text>
        </View>
      </View>

      {/* RESULTS TABLE */}
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={styles.colParam}>Test Parameter</Text>
          <Text style={styles.colResult}>Result</Text>
          <Text style={styles.colUnit}>Unit</Text>
          <Text style={styles.colRef}>Biological Ref. Range</Text>
        </View>

        {test.results.map((r: any, i: number) => {
          let resultStyle = styles.colResult;
          let flagMarker = "";

          if (r.flag === "HIGH" || r.flag === "CRITICAL_HIGH") {
            resultStyle = { ...styles.colResult, ...styles.flagHigh };
            flagMarker = " (H)";
          }
          if (r.flag === "LOW" || r.flag === "CRITICAL_LOW") {
            resultStyle = { ...styles.colResult, ...styles.flagLow };
            flagMarker = " (L)";
          }

          return (
            <View key={i} style={styles.tableRow}>
              <Text style={styles.colParam}>{r.parameterName}</Text>
              <Text style={resultStyle}>
                {r.value}
                {flagMarker}
              </Text>
              <Text style={styles.colUnit}>{r.unit || "-"}</Text>
              <Text style={styles.colRef}>
                {r.refRangeMin !== null && r.refRangeMax !== null
                  ? `${r.refRangeMin} - ${r.refRangeMax}`
                  : r.refRangeText || "-"}
              </Text>
            </View>
          );
        })}
      </View>

      {/* FOOTER & SIGNATURE SECTION */}
      <View style={styles.footer}>
        <View style={styles.signatureBox}>
          <View>
            <Text style={styles.signLine}>Technician Signature</Text>
          </View>
          <View>
            <Text style={styles.signLine}>Pathologist / Lab Director</Text>
          </View>
        </View>
        <Text style={styles.footerText}>
          This is a system generated report. Report ID: {report.id} v
          {report.version}.0 | Generated at: {new Date().toLocaleString()}
        </Text>
      </View>
    </Page>
  </Document>
);

// --- 3. THE GET ROUTE HANDLER ---
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } },
) {
  try {
    const resolvedParams = await params;
    const rawId = resolvedParams?.id || "";
    const decodedId = decodeURIComponent(rawId).trim();
    const cleanId = decodedId.replace(/^(rep_|REP_|inv_|INV_|reg-|REG-|p-|P-)/i, '').trim();

    // 1. Try finding Report directly
    let report = await prisma.report.findFirst({
      where: {
        OR: [
          { id: decodedId },
          { id: cleanId },
          { testId: decodedId },
          { testId: cleanId },
        ],
      },
      include: {
        lab: true,
        patient: true,
        test: {
          include: {
            results: { orderBy: { id: "asc" } },
            doctor: true,
          },
        },
      },
    });

    // 2. If no report found, find test directly (e.g. from Test ID or Invoice ID)
    if (!report || !report.test) {
      const test = await prisma.test.findFirst({
        where: {
          OR: [
            { id: decodedId },
            { id: cleanId },
            { invoiceId: decodedId },
            { invoiceId: cleanId },
            { invoice: { invoiceNumber: decodedId } },
            { invoice: { invoiceNumber: cleanId } },
          ],
        },
        include: {
          lab: true,
          patient: true,
          results: { orderBy: { id: "asc" } },
          doctor: true,
        },
      });

      if (test && test.lab && test.patient) {
        report = {
          id: test.id,
          version: 1,
          createdAt: test.createdAt,
          lab: test.lab,
          patient: test.patient,
          test: test,
        } as any;
      }
    }

    if (!report || !report.test) {
      return NextResponse.json(
        { error: "Report or Test data not found" },
        { status: 404 },
      );
    }

    // Generate the PDF as a Node.js Stream
    const pdfStream = await renderToStream(
      <MedicalReportPDF
        report={report}
        test={report.test}
        lab={report.lab}
        patient={report.patient}
      />,
    );

    // Convert Node Stream to Web ReadableStream for Next.js
    const webStream = new ReadableStream({
      start(controller) {
        pdfStream.on("data", (chunk) => controller.enqueue(chunk));
        pdfStream.on("end", () => controller.close());
        pdfStream.on("error", (err) => controller.error(err));
      },
    });

    // Return the PDF to the browser
    return new NextResponse(webStream, {
      headers: {
        "Content-Type": "application/pdf",
        // Use 'inline' to view in browser, use 'attachment' to force download
        "Content-Disposition": `inline; filename="Report_${report.patient.name.replace(/\s+/g, "_")}.pdf"`,
      },
    });
  } catch (err) {
    console.error("PDF Generation Error:", err);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 },
    );
  }
}
