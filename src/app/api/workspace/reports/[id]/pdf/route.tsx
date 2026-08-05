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
const MedicalReportPDF = ({ report, test, lab, patient, showHeader = true, extraPages = 0, onePerPage = false, nablData = {} }: any) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* HEADER SECTION — can be hidden with ?header=false */}
      {showHeader && (
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
      )}

      {/* ✅ NABL STANDARD TIMESTAMPS */}
      {showHeader && nablData.collectedAt && (
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 10, fontSize: 8, color: "#64748b" }}>
          <Text>Collected: {new Date(nablData.collectedAt).toLocaleString('en-IN')}</Text>
          <Text>Received: {nablData.receivedAt ? new Date(nablData.receivedAt).toLocaleString('en-IN') : '—'}</Text>
          <Text>Printed: {new Date(nablData.printedAt).toLocaleString('en-IN')}</Text>
        </View>
      )}

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
            {nablData.checkedBy && <Text style={{ fontSize: 7, color: "#94a3b8" }}>Checked by: {nablData.checkedBy}</Text>}
            {nablData.checkedAt && <Text style={{ fontSize: 7, color: "#94a3b8" }}>at: {new Date(nablData.checkedAt).toLocaleString('en-IN')}</Text>}
          </View>
          <View>
            <Text style={styles.signLine}>Pathologist / Lab Director</Text>
            {nablData.approvedBy && <Text style={{ fontSize: 7, color: "#94a3b8" }}>Approved by: {nablData.approvedBy}</Text>}
            {nablData.approvedAt && <Text style={{ fontSize: 7, color: "#94a3b8" }}>at: {new Date(nablData.approvedAt).toLocaleString('en-IN')}</Text>}
          </View>
        </View>
        <Text style={styles.footerText}>
          This is a system generated report. Report ID: {report.id} v
          {report.version}.0 | Generated at: {new Date().toLocaleString()}
        </Text>
      </View>
    </Page>
    {/* ✅ Extra blank pages if requested via ?extraPages=N */}
    {Array.from({ length: extraPages }).map((_, i) => (
      <Page key={`extra-${i}`} size="A4" style={{ padding: 40 }}>
        <Text style={{ fontSize: 8, color: "#cbd5e1", textAlign: "center", marginTop: 200 }}>
          --- Intentionally Left Blank ---
        </Text>
      </Page>
    ))}
  </Document>
);

// --- 3. THE GET ROUTE HANDLER ---
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const reportId = params.id;

    // ✅ Query params for print options
    const url = new URL(req.url);
    const showHeader = url.searchParams.get("header") !== "false"; // default true
    const extraPages = parseInt(url.searchParams.get("extraPages") || "0");
    const onePerPage = url.searchParams.get("onePerPage") === "true";

    // Fetch the deeply nested report data
    const report = await prisma.report.findUnique({
      where: { id: reportId },
      include: {
        lab: true,
        patient: true,
        test: {
          include: {
            results: { orderBy: { order: "asc" } },
            doctor: true,
            sample: { select: { collectedAt: true, receivedAt: true, sampleId: true } },
          },
        },
      },
    });

    if (!report || !report.test) {
      return NextResponse.json(
        { error: "Report or Test data not found" },
        { status: 404 },
      );
    }

    // ✅ NABL timestamps
    const nablData = {
      collectedAt: report.test.sample?.collectedAt || null,
      receivedAt: report.test.sample?.receivedAt || null,
      printedAt: new Date(),
      checkedBy: report.test.checkedBy || null,
      checkedAt: report.test.checkedAt || null,
      approvedBy: report.test.approvedBy || null,
      approvedAt: report.test.approvedAt || null,
    };

    // Generate the PDF as a Node.js Stream
    const pdfStream = await renderToStream(
      <MedicalReportPDF
        report={report}
        test={report.test}
        lab={report.lab}
        patient={report.patient}
        showHeader={showHeader}
        extraPages={extraPages}
        onePerPage={onePerPage}
        nablData={nablData}
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
