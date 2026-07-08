import { NextRequest, NextResponse } from "next/server";
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
import { prisma } from "@/lib/prisma";
import QRCode from "qrcode";
import { format } from "date-fns";

export const dynamic = "force-dynamic";

// ============================================================================
// CONFIGURATION DEFAULTS HELPER
// ============================================================================
const getSafeConfig = (template: any) => {
  let config = template?.config;
  if (typeof config === "string") {
    try {
      config = JSON.parse(config);
    } catch (e) {
      config = {};
    }
  }
  if (!config) config = {};

  // ─── NEWEST FORMAT: Component-Based Canvas Builder ───
  if (
    config.components &&
    Array.isArray(config.components) &&
    config.components.length > 0
  ) {
    return { ...config, isNewBuilder: true };
  }

  // ─── NEW FORMAT: pages array ──────────────────────────
  if (config.pages && Array.isArray(config.pages) && config.pages.length > 0) {
    const page = config.pages[0];
    const elements = page.elements || [];
    const body = elements.map((el: any) => ({
      id: el.id || `block-${Date.now()}`,
      type:
        el.type === "text"
          ? "TEXT"
          : el.type === "image"
            ? "IMAGE"
            : el.type === "spacer"
              ? "SPACER"
              : "RESULTS_TABLE",
      content: el.content,
      height: el.height,
      imageUrl: el.imageUrl,
      imageScale: el.imageScale,
    }));

    return {
      isNewBuilder: false,
      layout: {
        margins: page.margin || { top: 10, bottom: 10, left: 10, right: 10 },
        border: page.border || {
          show: false,
          weight: 2,
          color: "#1e3a8a",
          padding: 5,
        },
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
      body: body,
      footer: {
        show: true,
        mode: "standard",
        text: "**Sample has been collected outside the laboratory.",
        isoMarkUrls: [],
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
      extraPages: config.extraPages || [],
    };
  }

  // ─── OLD FORMAT (fallback) ────────────────────────────
  return {
    isNewBuilder: false,
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
      isoMarkUrls: [],
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
    extraPages: config.extraPages || [],
  };
};

const getMinMax = (res: any) => {
  const rangeStr = res.referenceRangeText || res.refRangeText || "";
  const parts = rangeStr.split("-").map((s: string) => parseFloat(s.trim()));
  if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1]))
    return { min: parts[0], max: parts[1] };
  if (res.refRangeMin != null && res.refRangeMax != null)
    return { min: res.refRangeMin, max: res.refRangeMax };
  return { min: null, max: null };
};

// ============================================================================
// REACT-PDF STYLE MAPPER FOR NEW BUILDER
// ============================================================================
const mapStyleToPdf = (style: any): Record<string, any> => {
  if (!style) return {};
  const s: Record<string, any> = {};
  if (style.fontFamily)
    s.fontFamily = style.fontFamily.split(",")[0].replace(/'/g, "").trim();
  if (style.fontSize) s.fontSize = style.fontSize;
  if (style.fontWeight) s.fontWeight = style.fontWeight;
  if (style.fontStyle === "italic") s.fontStyle = "italic";
  if (style.color) s.color = style.color;
  if (style.textAlign) s.textAlign = style.textAlign;
  if (style.textTransform) s.textTransform = style.textTransform;
  if (style.letterSpacing) s.letterSpacing = style.letterSpacing;
  if (style.lineHeight) s.lineHeight = style.lineHeight;
  if (style.opacity !== undefined && style.opacity < 100)
    s.opacity = style.opacity / 100;

  if (style.bgColor && style.bgColor !== "transparent") {
    s.backgroundColor = style.bgColor;
  }

  if (style.useIndividualBorders) {
    if (style.borderTopWidth > 0) {
      s.borderTopWidth = style.borderTopWidth;
      s.borderTopColor = style.borderTopColor;
      s.borderTopStyle = style.borderTopStyle;
    }
    if (style.borderRightWidth > 0) {
      s.borderRightWidth = style.borderRightWidth;
      s.borderRightColor = style.borderRightColor;
      s.borderRightStyle = style.borderRightStyle;
    }
    if (style.borderBottomWidth > 0) {
      s.borderBottomWidth = style.borderBottomWidth;
      s.borderBottomColor = style.borderBottomColor;
      s.borderBottomStyle = style.borderBottomStyle;
    }
    if (style.borderLeftWidth > 0) {
      s.borderLeftWidth = style.borderLeftWidth;
      s.borderLeftColor = style.borderLeftColor;
      s.borderLeftStyle = style.borderLeftStyle;
    }
  } else {
    if (style.borderWidth > 0 && style.borderStyle !== "none") {
      s.borderWidth = style.borderWidth;
      s.borderColor = style.borderColor;
      s.borderStyle = style.borderStyle;
    }
  }

  if (style.useIndividualRadius) {
    s.borderTopLeftRadius = style.borderTopLeftRadius;
    s.borderTopRightRadius = style.borderTopRightRadius;
    s.borderBottomLeftRadius = style.borderBottomLeftRadius;
    s.borderBottomRightRadius = style.borderBottomRightRadius;
  } else if (style.borderRadius > 0) {
    s.borderRadius = style.borderRadius;
  }

  s.paddingTop = style.paddingTop || 0;
  s.paddingRight = style.paddingRight || 0;
  s.paddingBottom = style.paddingBottom || 0;
  s.paddingLeft = style.paddingLeft || 0;

  if (style.rotation) s.transform = `rotate(${style.rotation}deg)`;

  return s;
};

// ============================================================================
// NEW BUILDER PDF DOCUMENT
// ============================================================================
const NewBuilderPDFDocument = ({ payload }: { payload: any }) => {
  const {
    patient,
    validTests,
    config,
    qrCodeDataUrl,
    barcodeValue,
    timestamps,
  } = payload;
  const { page, components } = config;
  const pxToPt = (px: number) => (px || 0) * 0.75;

  const pageStyles = StyleSheet.create({
    canvas: {
      width: pxToPt(page?.width || 794),
      height: pxToPt(page?.height || 1123),
      backgroundColor: page?.bgColor || "#ffffff",
      position: "relative",
      fontFamily:
        page?.fontFamily?.split(",")[0].replace(/'/g, "").trim() || "Helvetica",
    },
    watermark: {
      position: "absolute",
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      opacity: page?.watermarkOpacity || 0.08,
      zIndex: 0,
    },
    border: {
      position: "absolute",
      top: pxToPt(page?.border?.padding || 0),
      bottom: pxToPt(page?.border?.padding || 0),
      left: pxToPt(page?.border?.padding || 0),
      right: pxToPt(page?.border?.padding || 0),
      borderWidth: page?.border?.show ? page?.border?.weight || 1 : 0,
      borderColor: page?.border?.color || "#000000",
      borderRadius: page?.border?.radius || 0,
      zIndex: 1000,
    },
  });

  const getDynamicValue = (type: string) => {
    switch (type) {
      case "PATIENT_NAME":
        return patient.name;
      case "PATIENT_AGE":
        return `${patient.age} ${patient.ageUnit || "Y"}`;
      case "PATIENT_GENDER":
        return patient.gender;
      case "PATIENT_ID":
        return patient.patientId;
      case "PATIENT_PHONE":
        return patient.phone;
      case "PATIENT_ADDRESS":
        return patient.address;
      case "SAMPLE_ID":
        return barcodeValue;
      case "REF_DOCTOR":
        return timestamps.refDoctor;
      case "SENT_BY":
        return timestamps.refDoctor;
      case "COLLECTION_DATETIME":
        return timestamps.collected;
      case "REPORT_DATETIME":
        return timestamps.reported;
      case "DATE_BLOCK":
        return timestamps.reported;
      default:
        return "---";
    }
  };

  const sortedComponents = [...(components || [])].sort(
    (a: any, b: any) => (a.zIndex || 0) - (b.zIndex || 0),
  );

  return (
    <Document>
      <Page size="A4" style={{ padding: 0, margin: 0 }}>
        <View style={pageStyles.canvas}>
          {page?.watermarkUrl && (
            <View style={pageStyles.watermark} fixed>
              <Image
                src={page.watermarkUrl}
                style={{
                  width: "60%",
                  objectFit: "contain",
                  transform: "rotate(-30deg)",
                }}
              />
            </View>
          )}
          {page?.border?.show && <View style={pageStyles.border} fixed />}

          {sortedComponents.map((comp: any) => {
            if (comp.visible === false) return null;
            const absStyle: Record<string, any> = {
              position: "absolute",
              left: pxToPt(comp.x),
              top: pxToPt(comp.y),
              width: pxToPt(comp.width),
              height: pxToPt(comp.height),
              zIndex: comp.zIndex || 1,
            };

            const compPdfStyle = mapStyleToPdf(comp.style);
            const d = comp.data || {};

            // Dynamic Fields
            if (
              [
                "PATIENT_NAME",
                "PATIENT_AGE",
                "PATIENT_GENDER",
                "PATIENT_ID",
                "REF_DOCTOR",
                "SENT_BY",
                "SAMPLE_ID",
                "COLLECTION_DATETIME",
                "REPORT_DATETIME",
                "EMPLOYEE_ID",
                "PATIENT_PHONE",
                "PATIENT_ADDRESS",
                "DATE_BLOCK",
              ].includes(comp.type)
            ) {
              return (
                <View
                  key={comp.id}
                  style={{
                    ...absStyle,
                    ...compPdfStyle,
                    flexDirection: "row",
                    alignItems: "flex-end",
                  }}>
                  {d.showLabel !== false && (
                    <Text
                      style={{
                        fontSize: (compPdfStyle.fontSize || 10) * 0.85,
                        opacity: 0.7,
                      }}>
                      {d.label}:{" "}
                    </Text>
                  )}
                  <Text style={{ fontWeight: "bold" }}>
                    {getDynamicValue(comp.type)}
                  </Text>
                </View>
              );
            }

            if (
              comp.type === "TEXT" ||
              comp.type === "RICH_TEXT" ||
              comp.type === "DISCLAIMER"
            ) {
              return (
                <View key={comp.id} style={{ ...absStyle, ...compPdfStyle }}>
                  <Text>{d.content || ""}</Text>
                </View>
              );
            }

            if (comp.type === "BARCODE") {
              const bcUrl = `https://bwipjs-api.metafloor.com/?bcid=${d.format?.toLowerCase() || "code128"}&text=${barcodeValue}&scaleX=${d.barScale || 1.5}&scaleY=${(d.barHeight || 35) / 50}&height=${d.barHeight || 35}`;
              return (
                <View
                  key={comp.id}
                  style={{
                    ...absStyle,
                    ...compPdfStyle,
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                  }}>
                  <Image
                    src={bcUrl}
                    style={{ width: "95%", height: pxToPt(d.barHeight || 35) }}
                  />
                </View>
              );
            }

            if (comp.type === "QR_CODE") {
              if (!qrCodeDataUrl) return null;
              return (
                <View
                  key={comp.id}
                  style={{
                    ...absStyle,
                    ...compPdfStyle,
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    backgroundColor: "#ffffff",
                  }}>
                  <Image
                    src={qrCodeDataUrl}
                    style={{
                      width: pxToPt(Math.min(comp.width, comp.height) - 10),
                      height: pxToPt(Math.min(comp.width, comp.height) - 10),
                    }}
                  />
                  {d.showPageNumber && (
                    <Text
                      style={{
                        fontSize: 7,
                        textAlign: "center",
                        marginTop: 2,
                        color: "#64748b",
                      }}>
                      Page 1/1
                    </Text>
                  )}
                </View>
              );
            }

            if (
              [
                "LAB_LOGO",
                "CUSTOM_IMAGE",
                "HEADER_BANNER",
                "FOOTER_BANNER",
              ].includes(comp.type)
            ) {
              if (!d.imageUrl) return null;
              return (
                <Image
                  key={comp.id}
                  src={d.imageUrl}
                  style={{ ...absStyle, objectFit: "contain" }}
                />
              );
            }

            if (comp.type === "SIGNATURE") {
              return (
                <View
                  key={comp.id}
                  style={{
                    ...absStyle,
                    ...compPdfStyle,
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "flex-end",
                  }}>
                  {d.imageUrl && (
                    <Image
                      src={d.imageUrl}
                      style={{
                        width: "80%",
                        height: pxToPt(35),
                        objectFit: "contain",
                        marginBottom: 4,
                      }}
                    />
                  )}
                  {d.showDetails !== false && (
                    <View
                      style={{
                        alignItems: "center",
                        borderTopWidth: 1,
                        borderTopColor: "#000",
                        width: "100%",
                        paddingTop: 4,
                      }}>
                      {d.name && (
                        <Text style={{ fontSize: 9, fontWeight: "bold" }}>
                          {d.name}
                        </Text>
                      )}
                      {d.qualifications && (
                        <Text style={{ fontSize: 7, color: "#64748b" }}>
                          {d.qualifications}
                        </Text>
                      )}
                      {d.title && (
                        <Text style={{ fontSize: 7, fontWeight: "bold" }}>
                          {d.title}
                        </Text>
                      )}
                    </View>
                  )}
                </View>
              );
            }

            if (comp.type === "RESULTS_TABLE") {
              const tableFontSize = compPdfStyle.fontSize || 10;
              const hBg = d.headerBgColor || "#1e3a8a";
              const hTxt = d.headerTextColor || "#ffffff";
              const altBg = d.rowAltColor || "#f1f5f9";
              const showRef = d.showRefRange !== false;
              const showUnit = d.showUnit !== false;
              const colW =
                showRef && showUnit
                  ? ["40%", "20%", "15%", "25%"]
                  : showUnit
                    ? ["50%", "30%", "20%"]
                    : ["60%", "40%"];

              return (
                <View key={comp.id} style={{ ...absStyle, ...compPdfStyle }}>
                  {validTests.map((test: any, tIdx: number) => {
                    if (!test.results?.length) return null;
                    return (
                      <View
                        key={tIdx}
                        style={{ marginBottom: 10 }}
                        wrap={false}>
                        {d.showDepartmentGroup !== false &&
                          test.testTemplate?.department?.name && (
                            <View
                              style={{
                                backgroundColor: hBg,
                                paddingVertical: 4,
                                paddingHorizontal: 8,
                                marginBottom: 4,
                              }}>
                              <Text
                                style={{
                                  fontSize: tableFontSize - 1,
                                  color: hTxt,
                                  fontWeight: "bold",
                                  textTransform: "uppercase",
                                  textAlign: "center",
                                }}>
                                {test.testTemplate.department.name}
                              </Text>
                            </View>
                          )}

                        {d.showHeader !== false && (
                          <View
                            style={{
                              flexDirection: "row",
                              backgroundColor: hBg,
                              paddingVertical: 4,
                              paddingHorizontal: 4,
                              borderBottomWidth: 2,
                              borderBottomColor: hBg,
                            }}
                            wrap={false}>
                            <View style={{ width: colW[0] }}>
                              <Text
                                style={{
                                  fontSize: tableFontSize,
                                  color: hTxt,
                                  fontWeight: "bold",
                                }}>
                                Parameter
                              </Text>
                            </View>
                            <View style={{ width: colW[1] }}>
                              <Text
                                style={{
                                  fontSize: tableFontSize,
                                  color: hTxt,
                                  fontWeight: "bold",
                                  textAlign: "center",
                                }}>
                                Result
                              </Text>
                            </View>
                            {showUnit && (
                              <View style={{ width: colW[2] }}>
                                <Text
                                  style={{
                                    fontSize: tableFontSize,
                                    color: hTxt,
                                    fontWeight: "bold",
                                    textAlign: "center",
                                  }}>
                                  Unit
                                </Text>
                              </View>
                            )}
                            {showRef && (
                              <View style={{ width: colW[3] }}>
                                <Text
                                  style={{
                                    fontSize: tableFontSize,
                                    color: hTxt,
                                    fontWeight: "bold",
                                    textAlign: "center",
                                  }}>
                                  Ref Range
                                </Text>
                              </View>
                            )}
                          </View>
                        )}

                        {test.results.map((res: any, rIdx: number) => {
                          const val =
                            res.value ||
                            res.textValue ||
                            res.numericValue ||
                            "";
                          const unt = res.unit || "";
                          const pName =
                            res.printName || res.parameterName || "";
                          const refRange =
                            res.referenceRangeText ||
                            res.refRangeText ||
                            (res.refRangeMin != null
                              ? `${res.refRangeMin} - ${res.refRangeMax}`
                              : "-");
                          const { min, max } = getMinMax(res);
                          const valNum = parseFloat(val);
                          let valColor = compPdfStyle.color || "#0f172a";
                          let isAbnormal = false;

                          if (!isNaN(valNum) && min !== null && max !== null) {
                            if (valNum < min || valNum > max) {
                              isAbnormal = true;
                              valColor = valNum < min ? "#2563eb" : "#dc2626";
                            }
                          } else if (
                            res.flag === "ABNORMAL" ||
                            res.isAbnormal
                          ) {
                            isAbnormal = true;
                            valColor = "#dc2626";
                          }

                          return (
                            <View
                              key={rIdx}
                              style={{
                                flexDirection: "row",
                                backgroundColor:
                                  rIdx % 2 === 1 ? altBg : "transparent",
                                paddingVertical: 3,
                                paddingHorizontal: 4,
                                borderBottomWidth: 0.5,
                                borderBottomColor: "#e2e8f0",
                              }}
                              wrap={false}>
                              <View style={{ width: colW[0] }}>
                                <Text style={{ fontSize: tableFontSize }}>
                                  {pName}
                                </Text>
                              </View>
                              <View style={{ width: colW[1] }}>
                                <Text
                                  style={{
                                    fontSize: tableFontSize,
                                    fontWeight: isAbnormal ? "bold" : "normal",
                                    color: valColor,
                                    textAlign: "center",
                                  }}>
                                  {val}
                                  {isAbnormal
                                    ? valNum < min
                                      ? " L"
                                      : " H"
                                    : ""}
                                </Text>
                              </View>
                              {showUnit && (
                                <View style={{ width: colW[2] }}>
                                  <Text
                                    style={{
                                      fontSize: tableFontSize,
                                      color: "#64748b",
                                      textAlign: "center",
                                    }}>
                                    {unt}
                                  </Text>
                                </View>
                              )}
                              {showRef && (
                                <View style={{ width: colW[3] }}>
                                  <Text
                                    style={{
                                      fontSize: tableFontSize,
                                      color: "#64748b",
                                      textAlign: "center",
                                    }}>
                                    {refRange}
                                  </Text>
                                </View>
                              )}
                            </View>
                          );
                        })}
                      </View>
                    );
                  })}
                </View>
              );
            }

            if (comp.type === "DEPARTMENT_HEADER") {
              return (
                <View key={comp.id} style={{ ...absStyle, ...compPdfStyle }}>
                  <Text>{d.title || ""}</Text>
                </View>
              );
            }

            if (comp.type === "SEPARATOR" || comp.type === "SPACER") {
              return (
                <View key={comp.id} style={{ ...absStyle, ...compPdfStyle }} />
              );
            }

            if (comp.type === "DIVIDER_DOTS") {
              return (
                <View key={comp.id} style={{ ...absStyle, ...compPdfStyle }}>
                  <Text
                    style={{
                      textAlign: "center",
                      color: compPdfStyle.color || "#94a3b8",
                    }}>
                    {(d.dotChar || "·").repeat(d.repeatCount || 60)}
                  </Text>
                </View>
              );
            }

            if (comp.type === "BOX_CONTAINER") {
              return (
                <View key={comp.id} style={{ ...absStyle, ...compPdfStyle }}>
                  {d.showTitle !== false && d.title && (
                    <Text
                      style={{
                        fontSize: 10,
                        fontWeight: "bold",
                        marginBottom: 4,
                        borderBottomWidth: 1,
                        borderBottomColor:
                          compPdfStyle.borderColor || "#e2e8f0",
                        paddingBottom: 3,
                      }}>
                      {d.title}
                    </Text>
                  )}
                </View>
              );
            }

            if (comp.type === "APPROVAL_STAMP") {
              return (
                <View
                  key={comp.id}
                  style={{
                    ...absStyle,
                    ...compPdfStyle,
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                  }}>
                  <Text
                    style={{
                      fontSize: compPdfStyle.fontSize,
                      fontWeight: 900,
                      textTransform: "uppercase",
                      letterSpacing: 2,
                    }}>
                    {d.text || "APPROVED"}
                  </Text>
                </View>
              );
            }

            if (comp.type === "PAGE_NUMBER") {
              const txt = (d.format || "Page {current} of {total}")
                .replace("{current}", "1")
                .replace("{total}", "1");
              return (
                <View key={comp.id} style={{ ...absStyle, ...compPdfStyle }}>
                  <Text style={{ textAlign: "center" }}>{txt}</Text>
                </View>
              );
            }

            return null;
          })}
        </View>
      </Page>
    </Document>
  );
};

// ============================================================================
// THE LEGACY PDF DOCUMENT COMPONENT
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
    printOptions,
  } = payload;
  const { branding, layout, header, footer, patientBlock, bodyOptions, body } =
    config;

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
      borderTopWidth: 0,
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
    colParam: { width: "40%", paddingRight: 10 },
    colResult: { width: "20%", paddingRight: 5 },
    colUnit: { width: "15%", paddingRight: 5 },
    colRef: { width: "25%", paddingRight: 5 },
  });

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

  const MainPage = () => (
    <Page size="A4" style={styles.page}>
      {layout?.border?.show && <View style={styles.pageBorder} fixed />}
      {branding?.watermarkUrl && (
        <View style={styles.watermarkWrapper} fixed>
          <Image src={branding.watermarkUrl} style={styles.watermarkImage} />
        </View>
      )}

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

      {header.show && printOptions?.includeHeader !== false && (
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
              <Text style={{ fontSize: 7, marginTop: 2 }}>{barcodeValue}</Text>
            </View>
          )}
        </View>
      )}

      {body.map((block: any, idx: number) => {
        if (block.type === "SPACER")
          return (
            <View key={idx} style={{ height: pxToPt(block.height || 20) }} />
          );
        if (block.type === "RESULTS_TABLE") {
          return (
            <View key={idx}>
              {validTests.map((test: any, testIdx: number) => {
                if (!test.results?.length) return null;
                return (
                  <View key={testIdx} style={{ marginBottom: 20 }} wrap={false}>
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
                      )
                        flagStatus = "HIGH";
                      let valColor = "#0f172a";
                      let icon = "";
                      let isAbnormal = false;
                      if (
                        flagStatus === "LOW" ||
                        flagStatus === "HIGH" ||
                        res.flag === "ABNORMAL" ||
                        res.flag === "CRITICAL"
                      )
                        isAbnormal = true;
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
                        } else if (flagStatus === "NORMAL")
                          valColor = "#059669";
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
                        {timestamps.received} | Reported: {timestamps.reported})
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
  );

  const extraPages = printOptions?.includeExtraPages
    ? config.extraPages || []
    : [];
  return (
    <Document>
      <MainPage />
      {extraPages.map((page: any, idx: number) => (
        <Page key={idx} size="A4" style={styles.page}>
          <View style={{ flex: 1, padding: 20 }}>
            <Text
              style={{ fontSize: 8, color: "#94a3b8", textAlign: "center" }}>
              {page.title || `Extra Page ${idx + 1}`}
            </Text>
            <View style={{ marginTop: 10 }}>
              <Text style={{ fontSize: 12, color: "#1e293b" }}>
                {page.content || page.html}
              </Text>
            </View>
          </View>
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
        </Page>
      ))}
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
          { error: "No completed tests found." },
          { status: 404 },
        );

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
          return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
      }

      const qrCodeDataUrl = await QRCode.toDataURL(
        payload.verificationUrl || "https://patholab.cloud/verify",
        { margin: 0, color: { dark: "#0f172a", light: "#ffffff" } },
      );

      let selectedTemplate = primaryTest.lab?.reportTemplates?.[0];
      if (payload.templateId) {
        const found = primaryTest.lab?.reportTemplates?.find(
          (t: any) => t.id === payload.templateId,
        );
        if (found) selectedTemplate = found;
      }
      const config = getSafeConfig(selectedTemplate);

      finalPayload = {
        patient: primaryTest.patient,
        lab: primaryTest.lab,
        validTests: fetchedTests,
        config,
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
            primaryTest.doctor?.user?.name ||
            primaryTest.referredBy ||
            primaryTest.agency?.agencyName ||
            "Self",
        },
        printOptions: payload.printOptions || {
          includeHeader: true,
          includeExtraPages: false,
        },
      };
    }

    // ─── DYNAMIC RENDERING BASED ON TEMPLATE FORMAT ───
    let stream;
    if (finalPayload.config.isNewBuilder) {
      stream = await renderToStream(
        <NewBuilderPDFDocument payload={finalPayload} />,
      );
    } else {
      stream = await renderToStream(
        <ClinicalPDFDocument payload={finalPayload} />,
      );
    }

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
