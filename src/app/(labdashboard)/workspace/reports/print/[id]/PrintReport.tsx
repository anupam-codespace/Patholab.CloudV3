"use client";

import React, { forwardRef } from "react";
import QRCode from "qrcode";
import Barcode from "react-barcode";

const PrintReport = forwardRef(
  (
    {
      patient,
      visits,
      config,
      barcodeValue,
      timestamps,
      qrDataUrl,
      printOptions,
    }: any,
    ref: any,
  ) => {
    const {
      primaryColor,
      secondaryColor,
      globalFontSize,
      fontFamily,
      watermarkUrl,
      watermarkOpacity,
    } = config.branding;

    const { body, bodyOptions } = config;
    const m = config.layout.margins;
    const pb = config.patientBlock;

    // QR rendering logic (simplified for print)
    const qrStyle = {
      width: config.qrCode.size,
      height: config.qrCode.size + (config.qrCode.showPageNumber ? 15 : 0),
    };

    // Filter visits to show only the selected one (latest by default)
    const selectedVisit = visits[0]; // or use a prop

    return (
      <div
        ref={ref}
        style={{
          fontFamily: fontFamily,
          fontSize: `${globalFontSize}px`,
          width: "210mm",
          minHeight: "297mm",
          padding: `${m.top}mm ${m.right}mm ${m.bottom}mm ${m.left}mm`,
          color: "#1e293b",
          boxSizing: "border-box",
          backgroundColor: "#ffffff",
          position: "relative",
        }}
        className="bg-white">
        {/* Page Border */}
        {config.layout.border.show && (
          <div
            style={{
              position: "absolute",
              top: config.layout.border.padding,
              bottom: config.layout.border.padding,
              left: config.layout.border.padding,
              right: config.layout.border.padding,
              border: `${config.layout.border.weight}px solid ${config.layout.border.color}`,
              zIndex: 10,
              boxSizing: "border-box",
              pointerEvents: "none",
            }}
          />
        )}

        {/* Watermark */}
        {watermarkUrl && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              opacity: watermarkOpacity,
              pointerEvents: "none",
              zIndex: 0,
            }}>
            <img
              src={watermarkUrl}
              style={{
                maxWidth: "75%",
                maxHeight: "75%",
                objectFit: "contain",
              }}
              alt="watermark"
            />
          </div>
        )}

        {/* QR Code - absolute */}
        {config.qrCode.show && config.qrCode.mode === "custom" && (
          <div
            style={{
              position: "absolute",
              zIndex: 100,
              left: `${config.qrCode.x}px`,
              top: `${config.qrCode.y}px`,
            }}>
            <div
              style={qrStyle}
              className="flex flex-col items-center bg-white p-1 border shadow-sm">
              <img
                src={qrDataUrl}
                style={{
                  width: config.qrCode.size - 8,
                  height: config.qrCode.size - 8,
                }}
                alt="QR"
              />
              {config.qrCode.showPageNumber && (
                <span
                  style={{
                    fontSize: "8px",
                    fontWeight: "bold",
                    color: "#1e293b",
                    marginTop: "4px",
                  }}>
                  Page 1 of 1
                </span>
              )}
            </div>
          </div>
        )}

        <div className="relative z-10 w-full h-full flex flex-col">
          {/* ─── HEADER ────────────────────────────── */}
          {config.header.show && printOptions.includeHeader !== false && (
            <div
              className={`w-full mb-4 pb-4 ${config.header.mode === "image" ? "" : "border-b-[3px]"}`}
              style={{ borderBottomColor: primaryColor }}>
              {config.header.mode === "image" && config.header.fullImage ? (
                <div
                  style={{
                    height: `${config.header.height || 150}px`,
                    overflow: "hidden",
                  }}>
                  <img
                    src={config.header.fullImage}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                    alt="Header"
                  />
                </div>
              ) : config.header.mode === "html" ? (
                <div dangerouslySetInnerHTML={{ __html: config.header.html }} />
              ) : (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    width: "100%",
                    marginTop: "8px",
                  }}>
                  <div style={{ flexShrink: 0, marginRight: "16px" }}>
                    {/* Left QR if positioned */}
                    {config.qrCode.mode === "preset" &&
                      config.qrCode.position === "header-left" && (
                        <div
                          style={qrStyle}
                          className="flex flex-col items-center bg-white p-1 border shadow-sm">
                          <img
                            src={qrDataUrl}
                            style={{
                              width: config.qrCode.size - 8,
                              height: config.qrCode.size - 8,
                            }}
                            alt="QR"
                          />
                          {config.qrCode.showPageNumber && (
                            <span
                              style={{
                                fontSize: "8px",
                                fontWeight: "bold",
                                color: "#1e293b",
                                marginTop: "4px",
                              }}>
                              Page 1 of 1
                            </span>
                          )}
                        </div>
                      )}
                  </div>

                  <div
                    style={{
                      flex: 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}>
                    {config.header.logoUrl ? (
                      <img
                        src={config.header.logoUrl}
                        style={{
                          height: "60px",
                          width: "auto",
                          objectFit: "contain",
                          marginRight: "16px",
                        }}
                        alt="Logo"
                      />
                    ) : (
                      <div
                        style={{
                          height: "60px",
                          width: "60px",
                          marginRight: "16px",
                          backgroundColor: "#f1f5f9",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          border: "1px solid #e2e8f0",
                          borderRadius: "8px",
                          fontWeight: "bold",
                          color: "#94a3b8",
                        }}>
                        L
                      </div>
                    )}
                    <div>
                      <h1
                        style={{
                          fontSize: "24px",
                          fontWeight: "bold",
                          color: primaryColor,
                          textTransform: "uppercase",
                          letterSpacing: "2px",
                          margin: 0,
                        }}>
                        {config.header.title}
                      </h1>
                      <p
                        style={{
                          fontSize: "14px",
                          fontWeight: "500",
                          color: secondaryColor,
                          margin: "4px 0 0",
                        }}>
                        {config.header.subTitle}
                      </p>
                    </div>
                  </div>

                  <div style={{ flexShrink: 0, marginLeft: "16px" }}>
                    {config.qrCode.mode === "preset" &&
                      config.qrCode.position === "header-right" && (
                        <div
                          style={qrStyle}
                          className="flex flex-col items-center bg-white p-1 border shadow-sm">
                          <img
                            src={qrDataUrl}
                            style={{
                              width: config.qrCode.size - 8,
                              height: config.qrCode.size - 8,
                            }}
                            alt="QR"
                          />
                          {config.qrCode.showPageNumber && (
                            <span
                              style={{
                                fontSize: "8px",
                                fontWeight: "bold",
                                color: "#1e293b",
                                marginTop: "4px",
                              }}>
                              Page 1 of 1
                            </span>
                          )}
                        </div>
                      )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ─── PATIENT BLOCK ──────────────────────── */}
          {pb.show && (
            <div
              style={{
                fontSize: `${pb.fontSize || 12}px`,
                marginBottom: "24px",
              }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: "16px",
                  marginTop: "8px",
                }}>
                {pb.barcode.show && (
                  <div
                    style={{ textAlign: pb.barcode.position, width: "100%" }}>
                    <div
                      style={{
                        display: "inline-block",
                        transform: `scale(${pb.barcode.scale})`,
                        transformOrigin:
                          pb.barcode.position === "center"
                            ? "center"
                            : pb.barcode.position,
                      }}>
                      <Barcode
                        value={barcodeValue}
                        height={pb.barcode.height}
                        width={1.5}
                        fontSize={10}
                        displayValue
                        margin={0}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "8px 32px",
                  borderBottom: `2px solid ${primaryColor}`,
                  paddingBottom: "16px",
                }}>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                  }}>
                  {pb.showName && (
                    <div style={{ display: "flex" }}>
                      <span
                        style={{
                          width: "112px",
                          fontWeight: "bold",
                          color: secondaryColor,
                        }}>
                        Patient Name
                      </span>
                      <span
                        style={{
                          fontWeight: "bold",
                          textTransform: "uppercase",
                        }}>
                        : {patient.name}
                      </span>
                    </div>
                  )}
                  {pb.showPatientId && (
                    <div style={{ display: "flex" }}>
                      <span
                        style={{
                          width: "112px",
                          fontWeight: "bold",
                          color: secondaryColor,
                        }}>
                        Patient ID
                      </span>
                      <span>: {patient.patientId}</span>
                    </div>
                  )}
                  {pb.showSentBy && (
                    <div style={{ display: "flex" }}>
                      <span
                        style={{
                          width: "112px",
                          fontWeight: "bold",
                          color: secondaryColor,
                        }}>
                        Sent By
                      </span>
                      <span className="truncate uppercase">
                        : {patient.agency?.agencyName || "Self"}
                      </span>
                    </div>
                  )}
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                  }}>
                  {pb.showAgeSex && (
                    <div style={{ display: "flex" }}>
                      <span
                        style={{
                          width: "128px",
                          fontWeight: "bold",
                          color: secondaryColor,
                        }}>
                        Age / Gender
                      </span>
                      <span style={{ fontWeight: "bold" }}>
                        : {patient.age} {patient.ageUnit} / {patient.gender}
                      </span>
                    </div>
                  )}
                  {pb.showEmployeeId && (
                    <div style={{ display: "flex" }}>
                      <span
                        style={{
                          width: "128px",
                          fontWeight: "bold",
                          color: secondaryColor,
                        }}>
                        Employee ID
                      </span>
                      <span>: {patient.employeeId || "-"}</span>
                    </div>
                  )}
                  {pb.showRefDoctor && (
                    <div style={{ display: "flex" }}>
                      <span
                        style={{
                          width: "128px",
                          fontWeight: "bold",
                          color: secondaryColor,
                        }}>
                        Ref. Doctor
                      </span>
                      <span style={{ textTransform: "uppercase" }}>
                        : {timestamps.refDoctor}
                      </span>
                    </div>
                  )}
                  {pb.showSampleCollection && (
                    <div style={{ display: "flex" }}>
                      <span
                        style={{
                          width: "128px",
                          fontWeight: "bold",
                          color: secondaryColor,
                        }}>
                        Collected
                      </span>
                      <span>: {timestamps.collected}</span>
                    </div>
                  )}
                  {pb.showReportReleased && (
                    <div style={{ display: "flex" }}>
                      <span
                        style={{
                          width: "128px",
                          fontWeight: "bold",
                          color: secondaryColor,
                        }}>
                        Reported
                      </span>
                      <span>: {timestamps.reported}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ─── RESULTS ────────────────────────────── */}
          <div style={{ flex: 1 }}>
            {body.map((block: any) => {
              if (block.type === "RESULTS_TABLE") {
                return (
                  <div key={block.id}>
                    {selectedVisit.tests.map((test: any) => {
                      if (!test.results || test.results.length === 0)
                        return null;
                      return (
                        <div
                          key={test.id}
                          style={{ marginBottom: "24px", width: "100%" }}>
                          {bodyOptions?.groupDepartmentWise &&
                            test.testTemplate?.department?.name && (
                              <div
                                style={{
                                  backgroundColor: "#f1f5f9",
                                  fontWeight: "bold",
                                  padding: "6px 12px",
                                  marginBottom: "16px",
                                  fontSize: "12px",
                                  textTransform: "uppercase",
                                  textAlign: "center",
                                  borderTop: "1px solid #cbd5e1",
                                  borderBottom: "1px solid #cbd5e1",
                                  letterSpacing: "1px",
                                }}>
                                {test.testTemplate.department.name}
                              </div>
                            )}
                          <h2
                            style={{
                              textAlign: "center",
                              fontWeight: "bold",
                              fontSize: "18px",
                              marginBottom: "16px",
                              textDecoration: "underline",
                              textTransform: "uppercase",
                              color: primaryColor,
                            }}>
                            {test.testName}
                          </h2>
                          <table
                            style={{
                              width: "100%",
                              borderCollapse: "collapse",
                              fontSize: `${bodyOptions.tableFontSize || 11}px`,
                            }}>
                            <thead>
                              <tr
                                style={{
                                  borderBottom: `2px solid ${primaryColor}`,
                                  borderTop: `2px solid ${primaryColor}`,
                                }}>
                                <th
                                  style={{
                                    padding: "10px 4px",
                                    textAlign: "left",
                                    fontWeight: "bold",
                                    width: "40%",
                                  }}>
                                  Test Parameter
                                </th>
                                <th
                                  style={{
                                    padding: "10px 4px",
                                    textAlign: "left",
                                    fontWeight: "bold",
                                    width: "20%",
                                  }}>
                                  Result
                                </th>
                                <th
                                  style={{
                                    padding: "10px 4px",
                                    textAlign: "left",
                                    fontWeight: "bold",
                                    width: "20%",
                                  }}>
                                  Unit
                                </th>
                                {bodyOptions.showBiologicalRef && (
                                  <th
                                    style={{
                                      padding: "10px 4px",
                                      textAlign: "left",
                                      fontWeight: "bold",
                                      width: "20%",
                                    }}>
                                    Bio. Ref. Range
                                  </th>
                                )}
                              </tr>
                            </thead>
                            <tbody>
                              {test.results.map((res: any) => (
                                <tr
                                  key={res.id}
                                  style={{ borderBottom: "1px solid #f1f5f9" }}>
                                  <td
                                    style={{
                                      padding: "10px 4px",
                                      fontWeight: "500",
                                    }}>
                                    {res.printName || res.parameterName}
                                  </td>
                                  <td
                                    style={{
                                      padding: "10px 4px",
                                      fontWeight: "bold",
                                    }}>
                                    {res.value || res.numericValue || ""}
                                  </td>
                                  <td
                                    style={{
                                      padding: "10px 4px",
                                      color: "#64748b",
                                    }}>
                                    {res.unit || ""}
                                  </td>
                                  {bodyOptions.showBiologicalRef && (
                                    <td
                                      style={{
                                        padding: "10px 4px",
                                        color: "#64748b",
                                      }}>
                                      {res.referenceRangeText ||
                                        res.refRangeText ||
                                        "-"}
                                    </td>
                                  )}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      );
                    })}
                  </div>
                );
              }
              if (block.type === "SPACER") {
                return (
                  <div
                    key={block.id}
                    style={{ height: `${block.height || 20}px` }}
                  />
                );
              }
              if (block.type === "IMAGE" && block.imageUrl) {
                return (
                  <div
                    key={block.id}
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      marginBottom: "16px",
                    }}>
                    <img
                      src={block.imageUrl}
                      style={{
                        width: `${block.imageScale || 100}%`,
                        objectFit: "contain",
                      }}
                      alt="Content"
                    />
                  </div>
                );
              }
              return null;
            })}
          </div>

          {/* ─── EXTRA PAGES ──────────────────────────── */}
          {printOptions?.includeExtraPages &&
            config.extraPages?.map((page: any, idx: number) => (
              <div
                key={idx}
                style={{
                  pageBreakBefore: "always",
                  marginTop: "32px",
                  paddingTop: "32px",
                  borderTop: "1px solid #cbd5e1",
                }}>
                <div
                  dangerouslySetInnerHTML={{
                    __html: page.html || page.content,
                  }}
                />
              </div>
            ))}

          {/* ─── FOOTER ────────────────────────────────── */}
          {config.footer.show && (
            <div
              style={{
                marginTop: "auto",
                paddingTop: "16px",
                borderTop:
                  config.footer.mode === "image"
                    ? "none"
                    : `2px solid ${primaryColor}`,
                position: "relative",
              }}>
              {config.footer.mode === "image" && config.footer.fullImage ? (
                <div
                  style={{
                    height: `${config.footer.height || 100}px`,
                    overflow: "hidden",
                  }}>
                  <img
                    src={config.footer.fullImage}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                    alt="Footer"
                  />
                </div>
              ) : config.footer.mode === "html" ? (
                <div dangerouslySetInnerHTML={{ __html: config.footer.html }} />
              ) : (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    width: "100%",
                  }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-end",
                      width: "100%",
                      marginBottom: "16px",
                      padding: "0 40px",
                    }}>
                    <div style={{ flexShrink: 0, marginRight: "16px" }}>
                      {config.qrCode.mode === "preset" &&
                        config.qrCode.position === "footer-left" && (
                          <div
                            style={qrStyle}
                            className="flex flex-col items-center bg-white p-1 border shadow-sm">
                            <img
                              src={qrDataUrl}
                              style={{
                                width: config.qrCode.size - 8,
                                height: config.qrCode.size - 8,
                              }}
                              alt="QR"
                            />
                            {config.qrCode.showPageNumber && (
                              <span
                                style={{
                                  fontSize: "8px",
                                  fontWeight: "bold",
                                  color: "#1e293b",
                                  marginTop: "4px",
                                }}>
                                Page 1 of 1
                              </span>
                            )}
                          </div>
                        )}
                    </div>
                    <div
                      style={{
                        flex: 1,
                        display: "flex",
                        justifyContent: "space-around",
                        alignItems: "flex-end",
                        padding: "0 16px",
                      }}>
                      {config.footer.signatures?.map(
                        (sig: any, idx: number) =>
                          sig.show && (
                            <div
                              key={idx}
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                width: `${sig.width}px`,
                              }}>
                              <div
                                style={{
                                  height: "48px",
                                  display: "flex",
                                  alignItems: "flex-end",
                                  justifyContent: "center",
                                  marginBottom: "4px",
                                }}>
                                {sig.imageUrl && (
                                  <img
                                    src={sig.imageUrl}
                                    style={{
                                      height: "100%",
                                      objectFit: "contain",
                                    }}
                                    alt="Signature"
                                  />
                                )}
                              </div>
                              <div
                                style={{
                                  width: "100%",
                                  textAlign: "center",
                                  borderTop: "1px solid #cbd5e1",
                                  paddingTop: "4px",
                                }}>
                                <p
                                  style={{
                                    fontWeight: "bold",
                                    fontSize: "11px",
                                    color: "#0f172a",
                                    margin: 0,
                                    whiteSpace: "nowrap",
                                  }}>
                                  {sig.name}
                                </p>
                                <p
                                  style={{
                                    fontSize: "9px",
                                    color: "#64748b",
                                    margin: 0,
                                  }}>
                                  {sig.qualifications}
                                </p>
                                <p
                                  style={{
                                    fontWeight: "bold",
                                    fontSize: "9px",
                                    color: "#1e293b",
                                    textTransform: "uppercase",
                                    margin: "2px 0 0",
                                  }}>
                                  {sig.title}
                                </p>
                              </div>
                            </div>
                          ),
                      )}
                    </div>
                    <div style={{ flexShrink: 0, marginLeft: "16px" }}>
                      {config.qrCode.mode === "preset" &&
                        config.qrCode.position === "footer-right" && (
                          <div
                            style={qrStyle}
                            className="flex flex-col items-center bg-white p-1 border shadow-sm">
                            <img
                              src={qrDataUrl}
                              style={{
                                width: config.qrCode.size - 8,
                                height: config.qrCode.size - 8,
                              }}
                              alt="QR"
                            />
                            {config.qrCode.showPageNumber && (
                              <span
                                style={{
                                  fontSize: "8px",
                                  fontWeight: "bold",
                                  color: "#1e293b",
                                  marginTop: "4px",
                                }}>
                                Page 1 of 1
                              </span>
                            )}
                          </div>
                        )}
                    </div>
                  </div>
                </div>
              )}
              <div
                style={{
                  fontSize: "9px",
                  textAlign: "center",
                  marginTop: "16px",
                  paddingTop: "8px",
                  borderTop: "1px solid #e2e8f0",
                  color: secondaryColor,
                }}
                dangerouslySetInnerHTML={{ __html: config.footer.text || "" }}
              />
            </div>
          )}
        </div>
      </div>
    );
  },
);

PrintReport.displayName = "PrintReport";

export default PrintReport;
