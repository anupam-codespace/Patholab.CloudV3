import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDataFromToken } from "@/lib/auth";
import { formatIST, formatDateIST } from "@/lib/timezone";
import React from "react";
import { renderToBuffer, Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";

export const dynamic = "force-dynamic";

// ============================================================================
// GET /api/b2b/reports/[testId]/pdf
// B2B Partner downloads a PDF report on their own letterhead
// ============================================================================
export async function GET(
  req: NextRequest,
  { params }: { params: { testId: string } }
) {
  try {
    const user = await getDataFromToken(req);
    if (!user || user.role !== "B2B_PARTNER") {
      return NextResponse.json(
        { error: "Unauthorized — B2B partner only" },
        { status: 403 }
      );
    }

    const agency = await prisma.agency.findFirst({
      where: { userId: user.userId },
      include: {
        lab: {
          select: {
            id: true,
            name: true,
            city: true,
            state: true,
            address: true,
            phone: true,
            email: true,
          },
        },
      },
    });

    if (!agency) {
      return NextResponse.json(
        { error: "No agency linked to your account" },
        { status: 404 }
      );
    }

    // Fetch the test + ensure it belongs to this agency
    const test = await prisma.test.findFirst({
      where: { id: params.testId, agencyId: agency.id },
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            age: true,
            gender: true,
            phone: true,
            patientId: true,
          },
        },
        results: {
          orderBy: { order: "asc" },
        },
        report: { select: { id: true, status: true, reportUrl: true } },
        lab: { select: { name: true, city: true } },
      },
    });

    if (!test) {
      return NextResponse.json(
        { error: "Report not found or not authorized" },
        { status: 404 }
      );
    }

    // Build PDF using @react-pdf/renderer
    const pdfBuffer = await renderToBuffer(
      <B2BReportDocument
        agency={agency}
        test={test as any}
        labName={test.lab?.name || agency.lab?.name || ""}
      />
    );

    const filename = `B2B-Report-${test.testNumber || test.id.slice(-6)}.pdf`;
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (error: any) {
    console.error("[B2B_REPORT_PDF]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// ============================================================================
// PDF Document Component
// ============================================================================
const styles = StyleSheet.create({
  page: {
    padding: 36,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#1f2937",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottomWidth: 2,
    borderBottomColor: "#0f172a",
    paddingBottom: 12,
    marginBottom: 16,
  },
  headerLeft: { flex: 1 },
  agencyName: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
  },
  agencyContact: { fontSize: 9, color: "#475569", marginTop: 2 },
  headerRight: { alignItems: "flex-end" },
  reportTitle: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  reportMeta: { fontSize: 8, color: "#64748b", marginTop: 2 },
  section: { marginBottom: 14 },
  sectionTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
    textTransform: "uppercase",
    marginBottom: 6,
    backgroundColor: "#f1f5f9",
    padding: 4,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  label: { color: "#64748b" },
  value: { fontFamily: "Helvetica-Bold", color: "#1f2937" },
  resultsTable: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 4,
    overflow: "hidden",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    padding: 6,
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
  },
  tableRow: {
    flexDirection: "row",
    padding: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    fontSize: 9,
  },
  colParam: { flex: 2 },
  colValue: { flex: 1.5 },
  colRange: { flex: 2 },
  colFlag: { flex: 1, textAlign: "center" },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 36,
    right: 36,
    borderTopWidth: 1,
    borderTopColor: "#cbd5e1",
    paddingTop: 6,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 8,
    color: "#64748b",
  },
  signatureBlock: {
    marginTop: 30,
    alignItems: "flex-end",
  },
  signatureLine: {
    width: 180,
    borderTopWidth: 1,
    borderTopColor: "#1f2937",
    paddingTop: 4,
    alignItems: "center",
  },
});

function B2BReportDocument({
  agency,
  test,
  labName,
}: {
  agency: any;
  test: any;
  labName: string;
}) {
  const patient = test.patient || {};
  const results = test.results || [];
  const generatedAt = formatIST(test.report?.createdAt || test.completedAt || new Date());
  const collectedAt = test.sampleCollectedAt ? formatDateIST(test.sampleCollectedAt) : "—";

  return (
    <Document
      title={`Report — ${test.testName}`}
      author={agency.agencyName}
      subject="B2B Laboratory Report"
    >
      <Page size="A4" style={styles.page}>
        {/* Header — Agency Letterhead */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.agencyName}>{agency.agencyName}</Text>
            {agency.contactPerson ? (
              <Text style={styles.agencyContact}>
                Contact: {agency.contactPerson}
              </Text>
            ) : null}
            {agency.email || agency.phone ? (
              <Text style={styles.agencyContact}>
                {agency.email ? agency.email : ""}
                {agency.email && agency.phone ? "  •  " : ""}
                {agency.phone ? `Phone: ${agency.phone}` : ""}
              </Text>
            ) : null}
            {agency.panNumber ? (
              <Text style={styles.agencyContact}>PAN: {agency.panNumber}</Text>
            ) : null}
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.reportTitle}>Diagnostic Report</Text>
            <Text style={styles.reportMeta}>Report No: {test.testNumber || test.id.slice(-8)}</Text>
            <Text style={styles.reportMeta}>Generated: {generatedAt}</Text>
          </View>
        </View>

        {/* Patient Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Patient Details</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Name</Text>
            <Text style={styles.value}>{patient.name || "—"}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Patient ID</Text>
            <Text style={styles.value}>{patient.patientId || "—"}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Age / Gender</Text>
            <Text style={styles.value}>
              {patient.age ? `${patient.age} yrs` : "—"} /{" "}
              {patient.gender || "—"}
            </Text>
          </View>
          {patient.phone ? (
            <View style={styles.row}>
              <Text style={styles.label}>Phone</Text>
              <Text style={styles.value}>{patient.phone}</Text>
            </View>
          ) : null}
        </View>

        {/* Test Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Test Information</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Test Name</Text>
            <Text style={styles.value}>{test.testName}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Test Code</Text>
            <Text style={styles.value}>{test.testCode || "—"}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Sample Collected</Text>
            <Text style={styles.value}>{collectedAt}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Status</Text>
            <Text style={styles.value}>{test.status}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Processed at Lab</Text>
            <Text style={styles.value}>{labName || "—"}</Text>
          </View>
        </View>

        {/* Results Table */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Test Results</Text>
          {results.length === 0 ? (
            <Text style={{ fontSize: 9, color: "#64748b", fontStyle: "italic" }}>
              No results have been entered for this test yet.
            </Text>
          ) : (
            <View style={styles.resultsTable}>
              <View style={styles.tableHeader}>
                <Text style={styles.colParam}>Parameter</Text>
                <Text style={styles.colValue}>Value</Text>
                <Text style={styles.colRange}>Reference Range</Text>
                <Text style={styles.colFlag}>Flag</Text>
              </View>
              {results.map((r: any, idx: number) => (
                <View
                  key={r.id || idx}
                  style={styles.tableRow}
                  break={idx > 0 && idx % 20 === 0}
                >
                  <Text style={styles.colParam}>
                    {r.printName || r.parameterCode}
                  </Text>
                  <Text style={styles.colValue}>
                    {r.numericValue !== null && r.numericValue !== undefined
                      ? String(r.numericValue)
                      : r.textValue || "—"}
                  </Text>
                  <Text style={styles.colRange}>
                    {r.referenceRangeText || "—"}
                  </Text>
                  <Text
                    style={[
                      styles.colFlag,
                      r.flag === "HIGH"
                        ? { color: "#dc2626" }
                        : r.flag === "LOW"
                          ? { color: "#2563eb" }
                          : {},
                    ]}
                  >
                    {r.flag || ""}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Impression / Notes */}
        {test.impression ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Impression / Notes</Text>
            <Text style={{ fontSize: 9 }}>{test.impression}</Text>
          </View>
        ) : null}

        {/* Signature */}
        <View style={styles.signatureBlock}>
          <View style={styles.signatureLine}>
            <Text style={{ fontSize: 9, fontFamily: "Helvetica-Bold" }}>
              {agency.agencyName}
            </Text>
            <Text style={{ fontSize: 8, color: "#64748b" }}>
              Authorized Signatory
            </Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text>
            Generated by {agency.agencyName} • Report ID:{" "}
            {test.testNumber || test.id.slice(-8)}
          </Text>
          <Text>{generatedAt}</Text>
        </View>
      </Page>
    </Document>
  );
}
