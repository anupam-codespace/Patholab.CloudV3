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
// CONFIGURATION DEFAULTS HELPER
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
      border: { show: false, weight: 1, color: "#cbd5e1", padding: 5 },
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
      height: 120,
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
      pageNumberPosition: "below-qr",
      ...config.qrCode,
    },
    patientBlock: {
      show: true,
      fontSize: 11,
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
      tableFontSize: 11,
      showBiologicalRef: true,
      showTestTimestamps: true,
      showClinicalFlags: true,
      ...config.bodyOptions,
    },
    body: config.body || [{ id: "fallback-2", type: "RESULTS_TABLE" }],
    footer: {
      show: true,
      mode: "standard",
      text: "**Sample has been collected outside the laboratory.",
      signatures: [],
      height: 80,
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

const getMinMax = (res: any) => {
  const rangeStr = res.referenceRangeText || res.refRangeText || "";
  const parts = rangeStr.split("-").map((s: string) => parseFloat(s.trim()));
  if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    return { min: parts[0], max: parts[1] };
  }
  if (res.refRangeMin != null && res.refRangeMax != null) {
    return { min: res.refRangeMin, max: res.refRangeMax };
  }
  return { min: null, max: null };
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

  // ✅ HEADER SKIP OPTION: Allow callers to download/print PDF without the lab header
  // (used by Report Dispatch page's "Download without header" button)
  if (payload.skipHeader) {
    header.show = false;
  }

  const pt = (mm: number) => (mm || 0) * 2.8346;
  const pxToPt = (px: number) => (px || 0) * 0.75;

  const mTop = pt(layout?.margins?.top ?? 10);
  const mBottom = pt(layout?.margins?.bottom ?? 10);
  const mLeft = pt(layout?.margins?.left ?? 10);
  const mRight = pt(layout?.margins?.right ?? 10);

  const headerHeight = header.show ? pxToPt(header.height || 120) : 0;
  const footerHeight = footer.show ? pxToPt(footer.height || 80) : 0;
  const qrSize = pxToPt(config.qrCode?.size || 60);

  const pagePaddingTop = headerHeight + mTop + 15;
  const pagePaddingBottom = footerHeight + mBottom + 30;

  const styles = StyleSheet.create({
    page: {
      paddingTop: pagePaddingTop,
      paddingBottom: pagePaddingBottom,
      paddingLeft: mLeft,
      paddingRight: mRight,
      fontFamily: "Helvetica",
      fontSize: branding.globalFontSize || 10,
      color: "#1e293b",
    },
    pageBorder: {
      position: "absolute",
      top: layout?.border?.padding || 10,
      bottom: layout?.border?.padding || 10,
      left: layout?.border?.padding || 10,
      right: layout?.border?.padding || 10,
      borderWidth: layout?.border?.show ? layout?.border?.weight || 1 : 0,
      borderColor: layout?.border?.color || "#cbd5e1",
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
      borderBottomColor: branding.primaryColor,
      flexDirection: "row",
      alignItems: "center",
    },
    footerZone: {
      position: "absolute",
      bottom: mBottom,
      left: mLeft,
      right: mRight,
      height: footerHeight,
      borderTopWidth: 0, // 🌟 FIX: Removed Top Border Line
    },
    patientBlock: {
      flexDirection: "row",
      justifyContent: "space-between",
      borderBottomWidth: 1,
      borderBottomColor: "#cbd5e1",
      paddingBottom: 10,
      marginBottom: 15,
      fontSize: patientBlock.fontSize || 11,
      lineHeight: 1.4,
    },
    patientCol: { flex: 1, flexDirection: "column", gap: 3 },
    label: { color: "#64748b" },
    value: { fontWeight: "bold", color: "#0f172a" },
    deptHeader: {
      backgroundColor: "#f1f5f9",
      paddingVertical: 4,
      textAlign: "center",
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
      borderColor: branding.primaryColor,
      paddingVertical: 6,
      fontWeight: "bold",
      fontSize: bodyOptions.tableFontSize || 11,
    },
    tableRow: {
      flexDirection: "row",
      borderBottomWidth: 1,
      borderBottomColor: "#f1f5f9",
      paddingVertical: 6,
      alignItems: "center",
      fontSize: bodyOptions.tableFontSize || 11,
    },
    // 🌟 FIX: Strict boundaries force text to wrap downwards instead of overlapping
    colParam: { width: "40%", paddingRight: 10 },
    colResult: { width: "20%", paddingRight: 5 },
    colUnit: { width: "15%", paddingRight: 5 },
    colRef: { width: "25%", paddingRight: 5 },
  });

  // 🌟 FIX: Simplified Page Number element to ensure it triggers correctly
  const PageNumberElement = () => (
    <Text
      style={{
        fontSize: 8,
        fontWeight: "bold",
        color: "#64748b",
        marginTop: 2,
        textAlign: "center",
      }}
      render={({ pageNumber, totalPages }) =>
        `Page ${pageNumber} of ${totalPages}`
      }
    />
  );

  // 🌟 FIX: QR Code Renderer with explicit height constraint
  const RenderQR = () => {
    if (!config.qrCode?.show || !qrCodeDataUrl) return null;

    return (
      <View
        style={{ alignItems: "center", width: qrSize, minHeight: qrSize + 15 }}>
        <Image
          src={qrCodeDataUrl}
          style={{ width: qrSize - 5, height: qrSize - 5 }}
        />
        {config.qrCode.showPageNumber &&
          config.qrCode.pageNumberPosition === "below-qr" && (
            <PageNumberElement />
          )}
      </View>
    );
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {layout?.border?.show && <View style={styles.pageBorder} fixed />}
        {branding?.watermarkUrl && (
          <View style={styles.watermarkWrapper} fixed>
            <Image src={branding.watermarkUrl} style={styles.watermarkImage} />
          </View>
        )}

        {/* --- CUSTOM ABSOLUTE QR --- */}
        {config.qrCode?.show && config.qrCode.mode === "custom" && (
          <View
            style={{
              position: "absolute",
              left: pxToPt(config.qrCode.x),
              top: pxToPt(config.qrCode.y),
            }}
            fixed>
            <RenderQR />
          </View>
        )}

        {/* --- HEADER --- */}
        {header.show && (
          <View style={styles.headerZone} fixed>
            {header.mode === "image" && header.fullImage ? (
              <>
                <Image
                  src={header.fullImage}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                    objectPosition: "left top",
                  }}
                />
                {/* Overlay QR on Image Letterheads */}
                {config.qrCode?.mode === "preset" &&
                  config.qrCode.position.includes("header") && (
                    <View
                      style={{
                        position: "absolute",
                        right:
                          config.qrCode.position === "header-right"
                            ? 10
                            : undefined,
                        left:
                          config.qrCode.position === "header-left"
                            ? 10
                            : undefined,
                        top: 10,
                      }}>
                      <RenderQR />
                    </View>
                  )}
              </>
            ) : (
              <View
                style={{ flex: 1, flexDirection: "row", alignItems: "center" }}>
                {config.qrCode?.mode === "preset" &&
                config.qrCode.position === "header-left" ? (
                  <RenderQR />
                ) : (
                  <View style={{ width: qrSize }} />
                )}

                <View
                  style={{
                    flex: 1,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                  }}>
                  {header.logoUrl && (
                    <Image
                      src={header.logoUrl}
                      style={{
                        maxWidth: pxToPt(150),
                        height: headerHeight - 20,
                        objectFit: "contain",
                        marginRight: 15,
                      }}
                    />
                  )}
                  <View style={{ textAlign: "center" }}>
                    <Text
                      style={{
                        fontSize: 20,
                        fontWeight: "bold",
                        color: branding.primaryColor,
                        textTransform: "uppercase",
                      }}>
                      {header.title || lab?.name}
                    </Text>
                    <Text
                      style={{
                        fontSize: 10,
                        color: branding.secondaryColor || "#64748b",
                        marginTop: 2,
                      }}>
                      {header.subTitle}
                    </Text>
                  </View>
                </View>

                {config.qrCode?.mode === "preset" &&
                config.qrCode.position === "header-right" ? (
                  <RenderQR />
                ) : (
                  <View style={{ width: qrSize }} />
                )}
              </View>
            )}
          </View>
        )}

        {/* --- PATIENT INFO BLOCK --- */}
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
                style={{
                  justifyContent: "center",
                  alignItems: "flex-end",
                  width: pxToPt(140),
                }}>
                <Image
                  src={`https://bwipjs-api.metafloor.com/?bcid=code128&text=${barcodeValue}&scaleX=2&scaleY=1`}
                  style={{ width: "100%", height: pxToPt(35) }}
                />
                <Text style={{ fontSize: 7, marginTop: 2 }}>
                  {barcodeValue}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* --- RESULTS BODY --- */}
        {body.map((block: any, idx: number) => {
          if (block.type === "SPACER")
            return (
              <View key={idx} style={{ height: pxToPt(block.height || 20) }} />
            );

          if (block.type === "RESULTS_TABLE") {
            return (
              <View key={idx}>
                {validTests.map((test: any, testIdx: number) => {
                  const hasResults = test.results && test.results.length > 0;
                  if (!hasResults) return null;

                  return (
                    <View key={testIdx} style={{ marginBottom: 20 }}>
                      {bodyOptions.groupDepartmentWise &&
                        test.testTemplate?.department?.name && (
                          <Text style={styles.deptHeader}>
                            {test.testTemplate.department.name}
                          </Text>
                        )}
                      <Text
                        style={{
                          fontSize: branding.globalFontSize + 2,
                          fontWeight: "bold",
                          color: branding.primaryColor,
                          textAlign: "center",
                          marginBottom: 8,
                          textTransform: "uppercase",
                        }}>
                        {test.testName}
                      </Text>

                      <View style={styles.tableHeader} wrap={false}>
                        <View style={styles.colParam}>
                          <Text>Test Parameter</Text>
                        </View>
                        <View style={styles.colResult}>
                          <Text>Result</Text>
                        </View>
                        <View style={styles.colUnit}>
                          <Text>Unit</Text>
                        </View>
                        {bodyOptions.showBiologicalRef && (
                          <View style={styles.colRef}>
                            <Text>Bio. Ref. Range</Text>
                          </View>
                        )}
                      </View>

                      {test.results.map((res: any, i: number) => {
                        const val =
                          res.value || res.textValue || res.numericValue || "";
                        const unt = res.unit || "";
                        const pName = res.printName || res.parameterName || "";
                        const refRange =
                          res.referenceRangeText ||
                          res.refRangeText ||
                          (res.refRangeMin != null
                            ? `${res.refRangeMin} - ${res.refRangeMax}`
                            : "-");

                        const { min, max } = getMinMax(res);
                        const valNum = parseFloat(val);
                        let flagStatus = "NONE";

                        if (!isNaN(valNum) && min !== null && max !== null) {
                          if (valNum < min) flagStatus = "LOW";
                          else if (valNum > max) flagStatus = "HIGH";
                          else flagStatus = "NORMAL";
                        } else if (
                          res.flag === "ABNORMAL" ||
                          res.flag === "CRITICAL" ||
                          res.isAbnormal
                        ) {
                          flagStatus = "HIGH";
                        }

                        let valColor = "#0f172a";
                        let icon = "";
                        let isAbnormal = false;

                        if (
                          flagStatus === "LOW" ||
                          flagStatus === "HIGH" ||
                          res.flag === "ABNORMAL" ||
                          res.flag === "CRITICAL"
                        ) {
                          isAbnormal = true;
                        }

                        if (
                          bodyOptions?.showClinicalFlags &&
                          flagStatus !== "NONE"
                        ) {
                          if (flagStatus === "LOW") {
                            valColor = "#2563eb";
                            icon = " (L)";
                          } else if (flagStatus === "HIGH") {
                            valColor = "#e11d48";
                            icon = " (H)";
                          } else if (flagStatus === "NORMAL") {
                            valColor = "#059669";
                          }
                        } else if (isAbnormal) {
                          valColor = "#dc2626";
                          icon = " *";
                        }

                        return (
                          <View key={i} style={styles.tableRow} wrap={false}>
                            <View style={styles.colParam}>
                              <Text>{pName}</Text>
                            </View>
                            <View style={styles.colResult}>
                              <Text
                                style={{
                                  fontWeight: isAbnormal ? "bold" : "normal",
                                  color: valColor,
                                }}>
                                {val}
                                {icon}
                              </Text>
                            </View>
                            <View style={styles.colUnit}>
                              <Text style={{ color: "#64748b" }}>{unt}</Text>
                            </View>
                            {bodyOptions.showBiologicalRef && (
                              <View style={styles.colRef}>
                                <Text style={{ color: "#64748b" }}>
                                  {refRange}
                                </Text>
                              </View>
                            )}
                          </View>
                        );
                      })}

                      {bodyOptions.showTestTimestamps && (
                        <Text
                          style={{
                            fontSize: 8,
                            color: "#94a3b8",
                            fontStyle: "italic",
                            marginTop: 8,
                          }}>
                          (Collected: {timestamps.collected} | Received:{" "}
                          {timestamps.received} | Reported:{" "}
                          {timestamps.reported})
                        </Text>
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

        {/* --- FOOTER --- */}
        {footer.show && (
          <View style={styles.footerZone} fixed>
            {footer.mode === "image" && footer.fullImage ? (
              <>
                <Image
                  src={footer.fullImage}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                    objectPosition: "center bottom",
                  }}
                />
                {/* Overlay QR on Image Footers */}
                {config.qrCode?.mode === "preset" &&
                  config.qrCode.position.includes("footer") && (
                    <View
                      style={{
                        position: "absolute",
                        right:
                          config.qrCode.position === "footer-right"
                            ? 10
                            : undefined,
                        left:
                          config.qrCode.position === "footer-left"
                            ? 10
                            : undefined,
                        bottom: 10,
                      }}>
                      <RenderQR />
                    </View>
                  )}
              </>
            ) : (
              <View style={{ paddingTop: 10, paddingHorizontal: 15 }}>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "flex-end",
                  }}>
                  {config.qrCode?.mode === "preset" &&
                  config.qrCode.position === "footer-left" ? (
                    <RenderQR />
                  ) : (
                    <View style={{ width: qrSize }} />
                  )}

                  <View
                    style={{
                      flexDirection: "row",
                      gap: 30,
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
                                  height: pxToPt(35),
                                  objectFit: "contain",
                                  marginBottom: 2,
                                }}
                              />
                            ) : (
                              <View style={{ height: pxToPt(35) }} />
                            )}
                            <Text
                              style={{
                                fontSize: 9,
                                fontWeight: "bold",
                                color: "#0f172a",
                              }}>
                              {sig.name}
                            </Text>
                            <Text style={{ fontSize: 7, color: "#64748b" }}>
                              {sig.qualifications}
                            </Text>
                            <Text
                              style={{
                                fontSize: 7,
                                fontWeight: "bold",
                                marginTop: 1,
                              }}>
                              {sig.title}
                            </Text>
                          </View>
                        ),
                    )}
                  </View>

                  {config.qrCode?.mode === "preset" &&
                  config.qrCode.position === "footer-right" ? (
                    <RenderQR />
                  ) : (
                    <View style={{ width: qrSize }} />
                  )}
                </View>

                <Text
                  style={{
                    fontSize: 8,
                    textAlign: "center",
                    color: "#94a3b8",
                    marginTop: 10,
                  }}>
                  {footer.text}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* --- GLOBAL BOTTOM PAGE NUMBERS (IF SELECTED) --- */}
        {config.qrCode?.showPageNumber &&
          config.qrCode.pageNumberPosition === "bottom-center" && (
            <Text
              fixed
              style={{
                position: "absolute",
                bottom: 10,
                left: 0,
                right: 0,
                textAlign: "center",
                fontSize: 8,
                color: "#94a3b8",
              }}
              render={({ pageNumber, totalPages }) =>
                `Page ${pageNumber} of ${totalPages}`
              }
            />
          )}
      </Page>
    </Document>
  );
};;;;

// ============================================================================
// MAIN API HANDLER
// ============================================================================
export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    let finalPayload = payload;

    // --- SECURE PUBLIC & INTERNAL DOWNLOAD INTERCEPT ---
    if (
      payload.action === "public_download" ||
      payload.action === "generate_invoice_report"
    ) {
      const id = payload.reportId || payload.invoiceId || payload.patientId;

      const includeQuery = {
        lab: { include: { reportTemplates: true } },
        patient: true,
        results: { orderBy: { order: "asc" as any } },
        testTemplate: { include: { Department: true } },
        sample: true,
        doctor: { include: { user: true } },
        agency: true,
      };

      let fetchedTests: any[] = [];

      const invoice = await prisma.invoice.findUnique({
        where: { id },
        include: { tests: { include: includeQuery } },
      });
      if (invoice && invoice.tests.length > 0) fetchedTests = invoice.tests;

      if (fetchedTests.length === 0) {
        const report = await prisma.report.findUnique({
          where: { id },
          include: { test: { include: includeQuery } },
        });
        if (report && report.test) fetchedTests = [report.test];
      }

      if (fetchedTests.length === 0) {
        const singleTest = await prisma.test.findUnique({
          where: { id },
          include: includeQuery,
        });
        if (singleTest) fetchedTests = [singleTest];
      }

      if (fetchedTests.length === 0) {
        const latestTest = await prisma.test.findFirst({
          where: { patientId: id },
          orderBy: { createdAt: "desc" },
        });
        if (latestTest) {
          if (latestTest.invoiceId) {
            const latestInvoice = await prisma.invoice.findUnique({
              where: { id: latestTest.invoiceId },
              include: { tests: { include: includeQuery } },
            });
            if (latestInvoice && latestInvoice.tests.length > 0)
              fetchedTests = latestInvoice.tests;
          } else {
            const populatedTest = await prisma.test.findUnique({
              where: { id: latestTest.id },
              include: includeQuery,
            });
            if (populatedTest) fetchedTests = [populatedTest];
          }
        }
      }

      if (fetchedTests.length === 0)
        return NextResponse.json(
          { error: "No completed tests found for this visit." },
          { status: 404 },
        );

      // INJECT MISSING UNITS
      const allParameterCodes = fetchedTests.flatMap((t) =>
        t.results.map((r: any) => r.parameterCode),
      );
      const uniqueCodes = [...new Set(allParameterCodes)];
      const masterParams = await prisma.labTestParameter.findMany({
        where: { code: { in: uniqueCodes } },
        select: { code: true, unit: true },
      });
      const paramUnitMap = new Map();
      masterParams.forEach((p) => paramUnitMap.set(p.code, p.unit));

      // Re-map with Units and Values
      fetchedTests = fetchedTests.map((test) => ({
        ...test,
        results: test.results.map((res: any) => ({
          ...res,
          unit: res.unit || paramUnitMap.get(res.parameterCode) || "",
          value: res.value || res.textValue || res.numericValue || "",
          referenceRangeText: res.referenceRangeText || res.refRangeText || "",
          printName:
            res.printName || res.parameterName || res.parameterCode || "",
        })),
      }));

      const primaryTest = fetchedTests[0];

      if (payload.action === "public_download") {
        const dbPhoneClean = (primaryTest.patient.phone || "")
          .replace(/\D/g, "")
          .slice(-10);
        const inputPhoneClean = (payload.phone || "")
          .replace(/\D/g, "")
          .slice(-10);
        if (dbPhoneClean !== inputPhoneClean)
          return NextResponse.json(
            { error: "Unauthorized. Incorrect mobile number." },
            { status: 401 },
          );
      }

      const qrCodeDataUrl = await QRCode.toDataURL(
        payload.verificationUrl || "https://patholab.cloud/verify",
        {
          margin: 0,
          color: { dark: "#0f172a", light: "#ffffff" },
        },
      );

      finalPayload = {
        patient: primaryTest.patient,
        lab: primaryTest.lab,
        validTests: fetchedTests,
        config: getSafeConfig(primaryTest.lab?.reportTemplates?.[0]?.config),
        qrCodeDataUrl,
        barcodeValue:
          primaryTest.sample?.sampleId || primaryTest.patient.patientId,
        timestamps: {
          collected: primaryTest.sampleCollectedAt
            ? format(
                new Date(primaryTest.sampleCollectedAt),
                "dd/MM/yy HH:mm:ss",
              )
            : "-",
          received: primaryTest.sampleReceivedAt
            ? format(
                new Date(primaryTest.sampleReceivedAt),
                "dd/MM/yy HH:mm:ss",
              )
            : "-",
          reported: primaryTest.approvedAt
            ? format(new Date(primaryTest.approvedAt), "dd/MM/yy HH:mm:ss")
            : "-",
          refDoctor:
            primaryTest.doctor?.name ||
            primaryTest.doctor?.user?.name ||
            primaryTest.referredBy ||
            primaryTest.agency?.agencyName ||
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
