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
  Font,
} from "@react-pdf/renderer";
import QRCode from "qrcode";

export const dynamic = "force-dynamic";

// ============================================================================
// 1. DYNAMIC PDF COMPONENT
// ============================================================================

const DynamicReportPDF = ({
  report,
  test,
  lab,
  patient,
  qrCodeDataUri,
  config,
}: any) => {
  const {
    layout,
    branding,
    header,
    qrCode,
    patientBlock,
    bodyOptions,
    body,
    footer,
  } = config;

  // Map JSON config to React-PDF Styles
  const styles = StyleSheet.create({
    page: {
      paddingTop: layout?.margins?.top * 2.83 || 30, // mm to pt conversion
      paddingBottom: layout?.margins?.bottom * 2.83 || 120,
      paddingLeft: layout?.margins?.left * 2.83 || 30,
      paddingRight: layout?.margins?.right * 2.83 || 30,
      fontFamily: "Helvetica",
      fontSize: branding?.globalFontSize || 10,
      color: "#1e293b",
    },
    // Header
    headerZone: {
      marginBottom: 15,
      borderBottomWidth: header?.mode === "image" ? 0 : 2,
      borderBottomColor: branding?.primaryColor || "#000",
      paddingBottom: 10,
      position: "relative",
    },
    headerImage: {
      width: "100%",
      height: header?.height || 120,
      objectFit: "contain",
    },
    labTitle: {
      fontSize: 20,
      fontWeight: "bold",
      color: branding?.primaryColor,
      textTransform: "uppercase",
    },

    // QR Code Absolute Positioning
    qrContainer: {
      position: "absolute",
      width: qrCode?.size || 60,
      height: qrCode?.size || 60,
    },

    // Patient Block
    patientBox: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 20,
      borderBottomWidth: 1,
      borderBottomColor: "#cbd5e1",
      paddingBottom: 10,
      fontSize: patientBlock?.fontSize || 11,
    },
    patientCol: { flexDirection: "column", gap: 3, flex: 1 },
    fieldLabel: {
      fontWeight: "bold",
      color: branding?.secondaryColor || "#64748b",
      fontSize: 8,
    },

    // Body
    deptHeader: {
      backgroundColor: "#f1f5f9",
      padding: 4,
      textAlign: "center",
      fontSize: 10,
      fontWeight: "bold",
      marginVertical: 10,
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderColor: "#cbd5e1",
      textTransform: "uppercase",
    },
    tableHeader: {
      flexDirection: "row",
      borderBottomWidth: 2,
      borderTopWidth: 2,
      borderColor: branding?.primaryColor,
      paddingVertical: 5,
      fontWeight: "bold",
      fontSize: bodyOptions?.tableFontSize || 10,
    },
    tableRow: {
      flexDirection: "row",
      paddingVertical: 5,
      borderBottomWidth: 1,
      borderBottomColor: "#f1f5f9",
      fontSize: bodyOptions?.tableFontSize || 10,
    },

    // Footer
    footerZone: {
      position: "absolute",
      bottom: layout?.margins?.bottom * 2.83 || 30,
      left: layout?.margins?.left * 2.83 || 30,
      right: layout?.margins?.right * 2.83 || 30,
      paddingTop: 10,
      borderTopWidth: 2,
      borderTopColor: branding?.primaryColor,
    },
    signatureRow: {
      flexDirection: "row",
      justifyContent: "space-around",
      marginTop: 10,
    },
    sigBlock: { alignItems: "center" },
    footerImg: {
      width: "100%",
      height: 40,
      objectFit: "contain",
      marginTop: 10,
    },
  });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* BACKGROUND WATERMARK */}
        {branding?.watermarkUrl && (
          <View
            style={{
              position: "absolute",
              top: "25%",
              left: "10%",
              opacity: branding.watermarkOpacity || 0.1,
            }}>
            <Image src={branding.watermarkUrl} style={{ width: 400 }} />
          </View>
        )}

        {/* 1. HEADER */}
        {header?.show && (
          <View style={styles.headerZone}>
            {/* Dynamic QR: Header Position */}
            {qrCode?.show && qrCode.position.startsWith("header") && (
              <View
                style={[
                  styles.qrContainer,
                  {
                    right: qrCode.position === "header-right" ? 0 : "auto",
                    left: qrCode.position === "header-left" ? 0 : "auto",
                  },
                ]}>
                <Image src={qrCodeDataUri} />
              </View>
            )}

            {header.mode === "image" ? (
              <Image src={header.fullImage} style={styles.headerImage} />
            ) : (
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                {header.logoUrl && (
                  <Image
                    src={header.logoUrl}
                    style={{ height: 50, width: 80, objectFit: "contain" }}
                  />
                )}
                <View style={{ marginLeft: header.logoUrl ? 10 : 0 }}>
                  <Text style={styles.labTitle}>
                    {header.title || lab.name}
                  </Text>
                  <Text style={{ fontSize: 9 }}>
                    {header.subTitle || lab.address}
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* 2. PATIENT DEMOGRAPHICS */}
        {patientBlock?.show && (
          <View style={styles.patientBox}>
            <View style={styles.patientCol}>
              {patientBlock.showName && (
                <Text>
                  <Text style={styles.fieldLabel}>Name: </Text>
                  {patient.name}
                </Text>
              )}
              {patientBlock.showAgeSex && (
                <Text>
                  <Text style={styles.fieldLabel}>Age/Sex: </Text>
                  {patient.age} / {patient.gender}
                </Text>
              )}
            </View>
            <View style={styles.patientCol}>
              {patientBlock.showPatientId && (
                <Text>
                  <Text style={styles.fieldLabel}>UHID: </Text>
                  {patient.patientId}
                </Text>
              )}
              {patientBlock.showRefDoctor && (
                <Text>
                  <Text style={styles.fieldLabel}>Ref By: </Text>
                  {test.doctor?.name || "Self"}
                </Text>
              )}
            </View>
          </View>
        )}

        {/* 3. DYNAMIC CONTENT BLOCKS */}
        {body?.map((block: any, i: number) => {
          if (block.type === "RESULTS_TABLE") {
            return (
              <View key={i} style={{ marginBottom: 15 }}>
                {bodyOptions?.groupDepartmentWise && test.department && (
                  <Text style={styles.deptHeader}>{test.department.name}</Text>
                )}
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "bold",
                    color: branding?.primaryColor,
                    marginBottom: 8,
                    textAlign: "center",
                  }}>
                  {test.testName}
                </Text>

                <View style={styles.tableHeader}>
                  <Text style={{ width: "40%" }}>Parameter</Text>
                  <Text style={{ width: "20%" }}>Result</Text>
                  <Text style={{ width: "15%" }}>Unit</Text>
                  <Text style={{ width: "25%" }}>Ref. Range</Text>
                </View>

                {test.results.map((res: any, idx: number) => (
                  <View key={idx} style={styles.tableRow}>
                    <Text style={{ width: "40%" }}>{res.parameterName}</Text>
                    <Text
                      style={{
                        width: "20%",
                        fontWeight: "bold",
                        color: res.isAbnormal ? "#dc2626" : "#1e293b",
                      }}>
                      {res.value}
                    </Text>
                    <Text style={{ width: "15%", color: "#64748b" }}>
                      {res.unit}
                    </Text>
                    <Text
                      style={{
                        width: "25%",
                        color: "#64748b",
                        fontSize: (bodyOptions?.tableFontSize || 10) - 2,
                      }}>
                      {res.refRangeText}
                    </Text>
                  </View>
                ))}
              </View>
            );
          }
          if (block.type === "SPACER")
            return <View key={i} style={{ height: block.height || 20 }} />;
          return null;
        })}

        {/* 4. FOOTER ZONE */}
        {footer?.show && (
          <View style={styles.footerZone} fixed>
            <View style={styles.signatureRow}>
              {footer.signatures?.map(
                (sig: any, idx: number) =>
                  sig.show && (
                    <View
                      key={idx}
                      style={[styles.sigBlock, { width: sig.width || 120 }]}>
                      {sig.imageUrl && (
                        <Image src={sig.imageUrl} style={{ height: 40 }} />
                      )}
                      <Text style={{ fontWeight: "bold" }}>{sig.name}</Text>
                      <Text style={{ fontSize: 7 }}>{sig.title}</Text>
                    </View>
                  ),
              )}

              {/* Dynamic QR: Footer Position */}
              {qrCode?.show && qrCode.position.startsWith("footer") && (
                <View style={{ alignItems: "center" }}>
                  <Image
                    src={qrCodeDataUri}
                    style={{ width: qrCode.size, height: qrCode.size }}
                  />
                </View>
              )}
            </View>

            {footer.footerBottomImage && (
              <Image src={footer.footerBottomImage} style={styles.footerImg} />
            )}
            <Text
              style={{
                fontSize: 7,
                textAlign: "center",
                marginTop: 10,
                color: "#94a3b8",
              }}>
              {footer.text}
            </Text>
          </View>
        )}
      </Page>
    </Document>
  );
};

// ============================================================================
// 2. THE GET HANDLER
// ============================================================================

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string; filename: string } },
) {
  try {
    const report = await prisma.report.findUnique({
      where: { id: params.id },
      include: {
        lab: true,
        patient: true,
        test: {
          include: {
            results: { orderBy: { order: "asc" } },
            doctor: true,
            testTemplate: { include: { department: true } },
          },
        },
      },
    });

    if (!report)
      return NextResponse.json({ error: "Report not found" }, { status: 404 });

    // Fetch the Lab's active design template
    const template = await prisma.reportTemplate.findFirst({
      where: { labId: report.labId, isActive: true },
    });

    const config = template?.config
      ? typeof template.config === "string"
        ? JSON.parse(template.config)
        : template.config
      : {};

    // Map Department
    if (report.test?.testTemplate?.department) {
      (report.test as any).department = report.test.testTemplate.department;
    }

    // Generate Verification QR (Linking back to this report's URL)
    const protocol = req.headers.get("x-forwarded-proto") || "http";
    const host = req.headers.get("host");
    const verificationUrl = `${protocol}://${host}/verify/${report.id}`;
    const qrCodeDataUri = await QRCode.toDataURL(verificationUrl, {
      margin: 1,
      width: 200,
    });

    const stream = await renderToStream(
      <DynamicReportPDF
        report={report}
        test={report.test}
        lab={report.lab}
        patient={report.patient}
        qrCodeDataUri={qrCodeDataUri}
        config={config}
      />,
    );

    return new NextResponse(stream as any, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${params.filename}"`,
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 },
    );
  }
}
