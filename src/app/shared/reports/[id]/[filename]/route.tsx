import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToStream,
  Image,
} from "@react-pdf/renderer"; // ✅ Added Image
import QRCode from "qrcode"; // ✅ Added QRCode

export const dynamic = "force-dynamic";

// --- 1. STYLING ---
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
    marginTop: 40,
    alignItems: "flex-end",
  },
  signLine: {
    width: 140,
    borderTopWidth: 1,
    borderTopColor: "#94a3b8",
    paddingTop: 5,
    textAlign: "center",
    fontSize: 8,
    fontWeight: "bold",
  },

  // ✅ QR CODE STYLING
  qrSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingTop: 10,
  },
  qrImage: { width: 60, height: 60 },
  qrText: { fontSize: 7, color: "#94a3b8", flex: 1 },
});

// --- 2. TEMPLATE ---
const MedicalReportPDF = ({
  report,
  test,
  lab,
  patient,
  qrCodeDataUri,
}: any) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* HEADER */}
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

      {/* PATIENT INFO */}
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
          <Text style={styles.label}>UHID</Text>
          <Text style={styles.value}>{patient.patientId}</Text>
          <Text style={styles.label}>SAMPLE ID</Text>
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
          <Text style={styles.colParam}>Parameter</Text>
          <Text style={styles.colResult}>Result</Text>
          <Text style={styles.colUnit}>Unit</Text>
          <Text style={styles.colRef}>Ref. Range</Text>
        </View>
        {test.results.map((r: any, i: number) => (
          <View key={i} style={styles.tableRow}>
            <Text style={styles.colParam}>{r.parameterName}</Text>
            <Text
              style={[
                styles.colResult,
                r.flag !== "NORMAL"
                  ? r.flag.includes("HIGH")
                    ? styles.flagHigh
                    : styles.flagLow
                  : {},
              ]}>
              {r.value} {r.flag !== "NORMAL" ? `(${r.flag[0]})` : ""}
            </Text>
            <Text style={styles.colUnit}>{r.unit || "-"}</Text>
            <Text style={styles.colRef}>
              {r.refRangeMin !== null
                ? `${r.refRangeMin}-${r.refRangeMax}`
                : r.refRangeText || "-"}
            </Text>
          </View>
        ))}
      </View>

      {/* FOOTER & SIGNATURE SECTION */}
      <View style={styles.footer}>
        <View style={styles.signatureBox}>
          <Text style={styles.signLine}>Technician Signature</Text>
          <Text style={styles.signLine}>Lab Director</Text>
        </View>

        {/* ✅ DYNAMIC QR CODE SECTION */}
        <View style={styles.qrSection}>
          {qrCodeDataUri && (
            <Image src={qrCodeDataUri} style={styles.qrImage} />
          )}
          <View>
            <Text style={styles.qrText}>
              Scan to verify the original digital report. This report is
              re-issued and digitally signed.
            </Text>
            <Text style={[styles.qrText, { marginTop: 2 }]}>
              Report ID: {report.id} | Version: {report.version}.0
            </Text>
          </View>
        </View>
      </View>
    </Page>
  </Document>
);

// --- 3. GET HANDLER ---
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string; filename: string } },
) {
  try {
    const reportId = params.id;
    const report = await prisma.report.findUnique({
      where: { id: reportId },
      include: {
        lab: true,
        patient: true,
        test: {
          include: { results: { orderBy: { order: "asc" } }, doctor: true },
        },
      },
    });

    if (!report || !report.test) {
      return new NextResponse(JSON.stringify({ error: "Data not found" }), {
        status: 404,
      });
    }

    // ✅ GENERATE QR CODE (Pointing to this exact URL)
    const reportUrl = req.url;
    const qrCodeDataUri = await QRCode.toDataURL(reportUrl, {
      margin: 1,
      width: 200,
      color: { dark: "#1e3a8a", light: "#ffffff" },
    });

    const pdfStream = await renderToStream(
      <MedicalReportPDF
        report={report}
        test={report.test}
        lab={report.lab}
        patient={report.patient}
        qrCodeDataUri={qrCodeDataUri}
      />,
    );

    const webStream = new ReadableStream({
      start(controller) {
        pdfStream.on("data", (chunk) => controller.enqueue(chunk));
        pdfStream.on("end", () => controller.close());
        pdfStream.on("error", (err) => controller.error(err));
      },
    });

    return new NextResponse(webStream, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${params.filename}"`,
      },
    });
  } catch (err) {
    console.error(err);
    return new NextResponse(JSON.stringify({ error: "Internal Error" }), {
      status: 500,
    });
  }
}
