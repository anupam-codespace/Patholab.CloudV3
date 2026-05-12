import { NextRequest, NextResponse } from "next/server";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToStream,
  Image,
} from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import QRCode from "qrcode";
import { format } from "date-fns";

export const dynamic = "force-dynamic";

// ============================================================================
// CONFIGURATION DEFAULTS HELPER (Ensures backend rendering never crashes)
// ============================================================================
const getSafeConfig = (configRaw: any) => {
  let config = configRaw;
  if (typeof config === "string") {
    try {
      config = JSON.parse(config);
    } catch (e) {
      config = {};
    }
  }
  if (!config) config = {};
  return {
    layout: {
      margins: { top: 10, bottom: 10, left: 10, right: 10 },
      border: { show: false, weight: 2, color: "#1e3a8a", padding: 5 },
      ...config.layout,
    },
    header: {
      show: true,
      mode: "standard",
      title: "GLOBIZ PATHOLAB",
      subTitle: "Medical District",
      logoUrl: "",
      fullImage: "",
      html: "",
      height: 150,
      ...config.header,
    },
    qrCode: {
      show: true,
      mode: "preset",
      position: "header-right",
      x: 650,
      y: 50,
      size: 60,
      margin: 10,
      showPageNumber: true,
      ...config.qrCode,
    },
    patientBlock: {
      show: true,
      fontSize: 12,
      barcode: { show: true, position: "center", height: 35, scale: 1.2 },
      showName: true,
      showPatientId: true,
      showSentBy: true,
      showAgeSex: true,
      showEmployeeId: true,
      showRefDoctor: true,
      showSampleCollection: true,
      showReportReleased: true,
      ...config.patientBlock,
    },
    bodyOptions: {
      groupDepartmentWise: true,
      tableFontSize: 13,
      showBiologicalRef: true,
      showTestTimestamps: true,
      ...config.bodyOptions,
    },
    body: config.body || [{ id: "fallback-2", type: "RESULTS_TABLE" }],
    footer: {
      show: true,
      mode: "standard",
      text: "**Sample has been collected outside the laboratory.",
      signatures: [],
      height: 100,
      footerBottomImage: "",
      ...config.footer,
    },
    branding: {
      primaryColor: "#000000",
      secondaryColor: "#475569",
      globalFontSize: 10,
      fontFamily: "Helvetica",
      watermarkUrl: "",
      watermarkOpacity: 0.1,
      ...config.branding,
    },
  };
};

// ============================================================================
// THE PDF DOCUMENT COMPONENT
// ============================================================================
const ClinicalPDFDocument = ({ payload }: { payload: any }) => {
  const {
    patient,
    validTests,
    config,
    qrCodeDataUrl,
    lab,
    barcodeValue,
    timestamps,
  } = payload;
  const { branding, layout, header, footer, patientBlock, bodyOptions, body } =
    config;

  // Measurement Converters
  const pt = (mm: number) => (mm || 0) * 2.8346; // Millimeters to Points (Margins)
  const pxToPt = (px: number) => (px || 0) * 0.75; // Screen Pixels to Print Points (Sliders/Drag)

  // Safe Margin & Sizing Variables
  const mTop = pt(layout?.margins?.top ?? 10);
  const mBottom = pt(layout?.margins?.bottom ?? 10);
  const mLeft = pt(layout?.margins?.left ?? 10);
  const mRight = pt(layout?.margins?.right ?? 10);

  const globalFont = branding?.globalFontSize || 10;
  const primaryColor = branding?.primaryColor || "#1e3a8a";
  const headerHeight = pxToPt(header?.height || 150);
  const footerHeight = pxToPt(footer?.height || 100);
  const qrSize = pxToPt(config.qrCode?.size || 60);

  const styles = StyleSheet.create({
    page: {
      paddingTop: header.show ? headerHeight + mTop + 10 : mTop + 10,
      paddingBottom: footer.show ? footerHeight + mBottom + 20 : mBottom + 10,
      paddingLeft: mLeft,
      paddingRight: mRight,
      fontFamily: "Helvetica",
      fontSize: globalFont,
      color: "#1e293b",
    },
    pageBorder: {
      position: "absolute",
      top: layout?.border?.padding || 10,
      bottom: layout?.border?.padding || 10,
      left: layout?.border?.padding || 10,
      right: layout?.border?.padding || 10,
      borderWidth: layout?.border?.show ? layout?.border?.weight || 1 : 0,
      borderColor: layout?.border?.color || "#000",
    },
    watermarkWrapper: {
      position: "absolute",
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      zIndex: -1,
    },
    watermarkImage: {
      width: 350,
      height: 350,
      objectFit: "contain",
      opacity: branding?.watermarkOpacity || 0.05,
      transform: "rotate(-30deg)",
    },
    headerZone: {
      position: "absolute",
      top: mTop,
      left: mLeft,
      right: mRight,
      height: headerHeight,
      borderBottomWidth: header.mode === "image" ? 0 : 2,
      borderBottomColor: primaryColor,
      flexDirection: "row",
      alignItems: "center",
    },
    patientBlock: {
      flexDirection: "row",
      justifyContent: "space-between",
      borderBottomWidth: 1,
      borderBottomColor: "#cbd5e1",
      paddingBottom: 10,
      marginBottom: 15,
      fontSize: patientBlock?.fontSize || 11,
      marginTop: 10,
    },
    patientCol: { flex: 1, flexDirection: "column", gap: 4 },
    label: { color: "#64748b" },
    value: { fontWeight: "bold", color: "#0f172a" },
    deptHeader: {
      backgroundColor: "#f1f5f9",
      paddingVertical: 4,
      textAlign: "center",
      fontSize: globalFont,
      fontWeight: "bold",
      textTransform: "uppercase",
      marginBottom: 8,
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderColor: "#cbd5e1",
    },
    tableHeader: {
      flexDirection: "row",
      borderBottomWidth: 2,
      borderTopWidth: 2,
      borderColor: primaryColor,
      paddingVertical: 6,
      fontWeight: "bold",
      fontSize: bodyOptions?.tableFontSize || 11,
    },
    tableRow: {
      flexDirection: "row",
      borderBottomWidth: 1,
      borderBottomColor: "#f1f5f9",
      paddingVertical: 6,
      fontSize: bodyOptions?.tableFontSize || 11,
      alignItems: "center",
    },
    footerZone: {
      position: "absolute",
      bottom: mBottom,
      left: mLeft,
      right: mRight,
      height: footerHeight,
      borderTopWidth: footer.mode === "image" ? 0 : 2,
      borderTopColor: primaryColor,
    },
  });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {layout?.border?.show && <View style={styles.pageBorder} fixed />}
        {branding?.watermarkUrl && (
          <View style={styles.watermarkWrapper} fixed>
            <Image src={branding.watermarkUrl} style={styles.watermarkImage} />
          </View>
        )}

        {/* CUSTOM POSITIONED QR CODE */}
        {config.qrCode?.show && config.qrCode.mode === "custom" && (
          <View
            style={{
              position: "absolute",
              left: pxToPt(config.qrCode.x),
              top: pxToPt(config.qrCode.y),
              alignItems: "center",
              width: qrSize,
              zIndex: 50,
            }}
            fixed>
            <Image
              src={qrCodeDataUrl}
              style={{ width: qrSize - 5, height: qrSize - 5 }}
            />
            {config.qrCode.showPageNumber && (
              <Text
                style={{
                  fontSize: 8,
                  fontWeight: "bold",
                  color: "#000000",
                  marginTop: 3,
                }}
                render={({ pageNumber, totalPages }) =>
                  `Page ${pageNumber} of ${totalPages}`
                }
              />
            )}
          </View>
        )}

        {/* HEADER */}
        {header.show && (
          <View style={styles.headerZone} fixed>
            {header.mode === "image" && header.fullImage ? (
              <Image
                src={header.fullImage}
                style={{ width: "100%", height: "100%", objectFit: "contain" }}
              />
            ) : (
              <>
                <View
                  style={{
                    flex: 1,
                    flexDirection: "row",
                    alignItems: "center",
                  }}>
                  {header.logoUrl && (
                    <Image
                      src={header.logoUrl}
                      style={{
                        maxWidth: pxToPt(150),
                        height: headerHeight - pxToPt(20),
                        objectFit: "contain",
                        marginRight: 15,
                      }}
                    />
                  )}
                  <View>
                    <Text
                      style={{
                        fontSize: 22,
                        fontWeight: "bold",
                        color: primaryColor,
                        textTransform: "uppercase",
                      }}>
                      {header.title || lab?.name}
                    </Text>
                    <Text
                      style={{
                        fontSize: 10,
                        color: branding?.secondaryColor || "#64748b",
                        marginTop: 2,
                      }}>
                      {header.subTitle}
                    </Text>
                  </View>
                </View>
                {config.qrCode?.show &&
                  config.qrCode.mode === "preset" &&
                  config.qrCode.position.includes("header") && (
                    <View style={{ alignItems: "center", width: qrSize }}>
                      <Image
                        src={qrCodeDataUrl}
                        style={{ width: qrSize - 5, height: qrSize - 5 }}
                      />
                      {config.qrCode.showPageNumber ? (
                        <Text
                          style={{
                            fontSize: 8,
                            fontWeight: "bold",
                            color: "#000000",
                            marginTop: 3,
                          }}
                          render={({ pageNumber, totalPages }) =>
                            `Page ${pageNumber} of ${totalPages}`
                          }
                        />
                      ) : (
                        <Text
                          style={{
                            fontSize: 6,
                            marginTop: 2,
                            color: "#64748b",
                          }}>
                          Scan to Verify
                        </Text>
                      )}
                    </View>
                  )}
              </>
            )}
          </View>
        )}

        {/* PATIENT BLOCK */}
        {patientBlock.show && (
          <View style={styles.patientBlock}>
            <View style={styles.patientCol}>
              {patientBlock.showName && (
                <Text>
                  <Text style={styles.label}>Patient Name: </Text>
                  <Text style={styles.value}>{patient.name}</Text>
                </Text>
              )}
              {patientBlock.showPatientId && (
                <Text>
                  <Text style={styles.label}>Patient ID/UHID: </Text>
                  <Text style={styles.value}>{patient.patientId}</Text>
                </Text>
              )}
              {patientBlock.showRefDoctor && (
                <Text>
                  <Text style={styles.label}>Referred By: </Text>
                  <Text style={styles.value}>{timestamps.refDoctor}</Text>
                </Text>
              )}
            </View>
            <View style={styles.patientCol}>
              {patientBlock.showAgeSex && (
                <Text>
                  <Text style={styles.label}>Age / Sex: </Text>
                  <Text style={styles.value}>
                    {patient.age} {patient.ageUnit} / {patient.gender}
                  </Text>
                </Text>
              )}
              {patientBlock.showSampleCollection && (
                <Text>
                  <Text style={styles.label}>Sample Collected: </Text>
                  <Text style={styles.value}>{timestamps.collected}</Text>
                </Text>
              )}
              {patientBlock.showReportReleased && (
                <Text>
                  <Text style={styles.label}>Report Released: </Text>
                  <Text style={styles.value}>{timestamps.reported}</Text>
                </Text>
              )}
            </View>
            {patientBlock.barcode?.show && barcodeValue && (
              <View
                style={{ justifyContent: "center", alignItems: "flex-end" }}>
                <Image
                  src={`https://bwipjs-api.metafloor.com/?bcid=code128&text=${barcodeValue}&scaleX=2&scaleY=1`}
                  style={{ width: pxToPt(130), height: pxToPt(35) }}
                />
                <Text style={{ fontSize: 7, marginTop: 2 }}>
                  {barcodeValue}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* DYNAMIC BODY */}
        {body.map((block: any, idx: number) => {
          if (block.type === "SPACER")
            return (
              <View key={idx} style={{ height: pxToPt(block.height || 20) }} />
            );

          if (block.type === "TEXT")
            return (
              <Text
                key={idx}
                style={{
                  fontSize: globalFont,
                  marginBottom: 10,
                  lineHeight: 1.5,
                }}>
                {(block.content || "").replace(/<[^>]*>?/gm, "")}
              </Text>
            );

          if (block.type === "IMAGE" && block.imageUrl)
            return (
              <View
                key={idx}
                style={{ alignItems: "center", marginBottom: 10 }}>
                <Image
                  src={block.imageUrl}
                  style={{
                    width: `${block.imageScale || 100}%`,
                    objectFit: "contain",
                  }}
                />
              </View>
            );

          if (block.type === "RESULTS_TABLE") {
            return (
              <View key={idx}>
                {validTests.map((test: any, testIdx: number) => {
                  const hasResults = test.results && test.results.length > 0;
                  return (
                    <View key={testIdx} style={{ marginBottom: 25 }}>
                      {hasResults && (
                        <View wrap={false}>
                          {bodyOptions.groupDepartmentWise &&
                            test.testTemplate?.department?.name && (
                              <Text style={styles.deptHeader}>
                                {test.testTemplate.department.name}
                              </Text>
                            )}
                          <Text
                            style={{
                              fontSize: globalFont + 4,
                              fontWeight: "bold",
                              color: primaryColor,
                              textAlign: "center",
                              marginBottom: 8,
                              textTransform: "uppercase",
                            }}>
                            {test.testName}
                          </Text>
                          <View style={styles.tableHeader}>
                            <Text style={{ width: "40%" }}>Test Parameter</Text>
                            <Text style={{ width: "20%" }}>Result</Text>
                            <Text style={{ width: "15%" }}>Unit</Text>
                            {bodyOptions.showBiologicalRef && (
                              <Text style={{ width: "25%" }}>
                                Bio. Ref. Range
                              </Text>
                            )}
                          </View>

                          {/* Print First Result */}
                          <View style={styles.tableRow}>
                            <Text style={{ width: "40%" }}>
                              {test.results[0].parameterName}
                            </Text>
                            <Text
                              style={{
                                width: "20%",
                                fontWeight: "bold",
                                color: test.results[0].isAbnormal
                                  ? "#dc2626"
                                  : "#0f172a",
                              }}>
                              {test.results[0].value}{" "}
                              {test.results[0].isAbnormal ? "*" : ""}
                            </Text>
                            <Text style={{ width: "15%", color: "#64748b" }}>
                              {test.results[0].unit}
                            </Text>
                            {bodyOptions.showBiologicalRef && (
                              <Text
                                style={{
                                  width: "25%",
                                  fontSize: bodyOptions.tableFontSize - 2,
                                  color: "#64748b",
                                }}>
                                {test.results[0].refRangeText}
                              </Text>
                            )}
                          </View>
                        </View>
                      )}

                      {/* Remaining Rows */}
                      {hasResults &&
                        test.results.length > 1 &&
                        test.results.slice(1).map((res: any, i: number) => (
                          <View
                            key={i + 1}
                            style={styles.tableRow}
                            wrap={false}>
                            <Text style={{ width: "40%" }}>
                              {res.parameterName}
                            </Text>
                            <Text
                              style={{
                                width: "20%",
                                fontWeight: "bold",
                                color: res.isAbnormal ? "#dc2626" : "#0f172a",
                              }}>
                              {res.value} {res.isAbnormal ? "*" : ""}
                            </Text>
                            <Text style={{ width: "15%", color: "#64748b" }}>
                              {res.unit}
                            </Text>
                            {bodyOptions.showBiologicalRef && (
                              <Text
                                style={{
                                  width: "25%",
                                  fontSize: bodyOptions.tableFontSize - 2,
                                  color: "#64748b",
                                }}>
                                {res.refRangeText}
                              </Text>
                            )}
                          </View>
                        ))}

                      {/* Timestamps */}
                      {bodyOptions.showTestTimestamps && (
                        <View wrap={false}>
                          <Text
                            style={{
                              fontSize: globalFont - 3,
                              color: "#94a3b8",
                              fontStyle: "italic",
                              marginTop: 8,
                            }}>
                            (Collected: {timestamps.collected} | Received:{" "}
                            {timestamps.received} | Reported:{" "}
                            {timestamps.reported})
                          </Text>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            );
          }
          return null;
        })}

        <Text
          style={{
            textAlign: "center",
            fontSize: 8,
            color: "#cbd5e1",
            marginTop: 20,
            textTransform: "uppercase",
            letterSpacing: 2,
          }}>
          *** End of Report ***
        </Text>

        {/* FOOTER */}
        {footer.show && (
          <View style={styles.footerZone} fixed>
            {footer.mode === "image" && footer.fullImage ? (
              <Image
                src={footer.fullImage}
                style={{ width: "100%", height: "100%", objectFit: "contain" }}
              />
            ) : (
              <View style={{ paddingTop: 15, paddingHorizontal: 20 }}>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "flex-end",
                  }}>
                  {/* Left Footer QR */}
                  {config.qrCode?.show &&
                  config.qrCode.mode === "preset" &&
                  config.qrCode.position === "footer-left" ? (
                    <View style={{ alignItems: "center", width: qrSize }}>
                      <Image
                        src={qrCodeDataUrl}
                        style={{ width: qrSize - 5, height: qrSize - 5 }}
                      />
                      {config.qrCode.showPageNumber && (
                        <Text
                          style={{
                            fontSize: 8,
                            fontWeight: "bold",
                            color: "#000000",
                            marginTop: 3,
                          }}
                          render={({ pageNumber, totalPages }) =>
                            `Page ${pageNumber} of ${totalPages}`
                          }
                        />
                      )}
                    </View>
                  ) : (
                    <View style={{ width: qrSize }} />
                  )}

                  {/* Signatures */}
                  <View
                    style={{
                      flexDirection: "row",
                      gap: 40,
                      flex: 1,
                      justifyContent: "center",
                    }}>
                    {footer.signatures?.map(
                      (sig: any, idx: number) =>
                        sig.show && (
                          <View
                            key={idx}
                            style={{
                              alignItems: "center",
                              width: pxToPt(sig.width || 120),
                            }}>
                            {sig.imageUrl ? (
                              <Image
                                src={sig.imageUrl}
                                style={{
                                  height: pxToPt(40),
                                  objectFit: "contain",
                                  marginBottom: 4,
                                }}
                              />
                            ) : (
                              <View style={{ height: pxToPt(40) }} />
                            )}
                            <Text
                              style={{
                                fontSize: 10,
                                fontWeight: "bold",
                                color: "#0f172a",
                              }}>
                              {sig.name}
                            </Text>
                            <Text style={{ fontSize: 8, color: "#64748b" }}>
                              {sig.qualifications}
                            </Text>
                            <Text
                              style={{
                                fontSize: 8,
                                fontWeight: "bold",
                                marginTop: 2,
                              }}>
                              {sig.title}
                            </Text>
                          </View>
                        ),
                    )}
                  </View>

                  {/* Right Footer QR */}
                  {config.qrCode?.show &&
                  config.qrCode.mode === "preset" &&
                  config.qrCode.position === "footer-right" ? (
                    <View style={{ alignItems: "center", width: qrSize }}>
                      <Image
                        src={qrCodeDataUrl}
                        style={{ width: qrSize - 5, height: qrSize - 5 }}
                      />
                      {config.qrCode.showPageNumber && (
                        <Text
                          style={{
                            fontSize: 8,
                            fontWeight: "bold",
                            color: "#000000",
                            marginTop: 3,
                          }}
                          render={({ pageNumber, totalPages }) =>
                            `Page ${pageNumber} of ${totalPages}`
                          }
                        />
                      )}
                    </View>
                  ) : (
                    <View style={{ width: qrSize }} />
                  )}
                </View>

                {footer.footerBottomImage && (
                  <Image
                    src={footer.footerBottomImage}
                    style={{
                      height: 30,
                      objectFit: "contain",
                      marginTop: 15,
                      alignSelf: "center",
                    }}
                  />
                )}

                <Text
                  style={{
                    fontSize: 8,
                    textAlign: "center",
                    color: "#94a3b8",
                    marginTop: 15,
                  }}>
                  {footer.text}
                </Text>

                {(!config.qrCode?.show ||
                  !config.qrCode.showPageNumber ||
                  config.qrCode.mode === "preset") && (
                  <Text
                    style={{
                      fontSize: 8,
                      textAlign: "center",
                      color: "#94a3b8",
                      marginTop: 5,
                    }}
                    render={({ pageNumber, totalPages }) =>
                      `Page ${pageNumber} of ${totalPages}`
                    }
                  />
                )}
              </View>
            )}
          </View>
        )}
      </Page>
    </Document>
  );
};

// ============================================================================
// MAIN API HANDLER
// ============================================================================
export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    let finalPayload = payload;

    // --- SECURE PUBLIC DOWNLOAD INTERCEPT ---
    if (payload.action === "public_download") {
      const id = payload.reportId;

      const includeQuery = {
        lab: { include: { reportTemplates: true } },
        patient: true,
        results: true,
        testTemplate: { include: { department: true } },
        sample: true,
        doctor: { include: { user: true } },
        agency: true,
      };

      let test = null;

      // 1. SMART SEARCH: Try Report ID
      const report = await prisma.report.findUnique({
        where: { id },
        include: { test: { include: includeQuery } },
      });
      if (report && report.test) test = report.test;

      // 2. SMART SEARCH: Try Test ID
      if (!test) {
        test = await prisma.test.findUnique({
          where: { id },
          include: includeQuery,
        });
      }

      // 3. SMART SEARCH: Try Patient ID
      if (!test) {
        const patient = await prisma.patient.findUnique({
          where: { id },
          include: {
            tests: {
              take: 1,
              orderBy: { createdAt: "desc" },
              include: includeQuery,
            },
          },
        });
        if (patient && patient.tests.length > 0) test = patient.tests[0];
      }

      // 4. SMART SEARCH: Try Invoice ID
      if (!test) {
        const invoice = await prisma.invoice.findUnique({
          where: { id },
          include: { tests: { take: 1, include: includeQuery } },
        });
        if (invoice && invoice.tests.length > 0) test = invoice.tests[0];
      }

      // If it's not found in ANY of those tables, return 404
      if (!test) {
        return NextResponse.json(
          { error: "Report not found" },
          { status: 404 },
        );
      }

      // ====================================================================
      // 🔒 VAULT SECURITY: STRICT PHONE NUMBER VERIFICATION
      // ====================================================================
      // Strip everything except numbers, and grab the last 10 digits
      const dbPhoneClean = (test.patient.phone || "").replace(/\D/g, '').slice(-10);
      const inputPhoneClean = (payload.phone || "").replace(/\D/g, '').slice(-10);

      // If the frontend didn't pass a matching phone number, DENY access
      if (dbPhoneClean !== inputPhoneClean) {
        return NextResponse.json(
          { error: "Unauthorized. Incorrect mobile number." }, 
          { status: 401 }
        );
      }
      // ====================================================================

      // Generate the QR Code string safely
      const qrCodeDataUrl = await QRCode.toDataURL(payload.verificationUrl, {
        margin: 0,
        color: { dark: "#0f172a", light: "#ffffff" },
      });

      // Build the final payload
      finalPayload = {
        patient: test.patient,
        lab: test.lab,
        validTests: [test],
        config: getSafeConfig(test.lab?.reportTemplates?.[0]?.config),
        qrCodeDataUrl,
        barcodeValue: test.sample?.sampleId || test.patient.patientId,
        timestamps: {
          collected: test.sampleCollectedAt
            ? format(new Date(test.sampleCollectedAt), "dd/MM/yy HH:mm:ss")
            : "-",
          received: test.sampleReceivedAt
            ? format(new Date(test.sampleReceivedAt), "dd/MM/yy HH:mm:ss")
            : "-",
          reported: test.approvedAt
            ? format(new Date(test.approvedAt), "dd/MM/yy HH:mm:ss")
            : "-",
          refDoctor:
            test.doctor?.user?.name ||
            test.referredBy ||
            test.agency?.agencyName ||
            "Self",
        },
      };
    }

    const stream = await renderToStream(
      <ClinicalPDFDocument payload={finalPayload} />,
    );
    return new NextResponse(stream as any, {
      headers: { "Content-Type": "application/pdf" },
    });
  } catch (error) {
    console.error("PDF Generation Error:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF document." },
      { status: 500 },
    );
  }
}