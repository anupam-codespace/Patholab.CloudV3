"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Loader2, Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import Barcode from "react-barcode";
import QRCode from "qrcode";

// --- 1. FETCH DATA ---
const fetchReportData = async (id: string) => {
  const res = await fetch(`/api/workspace/workflow/results/${id}`);
  if (!res.ok) throw new Error("Failed to load report data");
  return res.json();
};

// --- 2. CONFIG HELPER ---
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
      barcode: {
        show: true,
        position: "center",
        height: 35,
        scale: 1.2,
        ...config.patientBlock?.barcode,
      },
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
  };
};

const getReferenceRange = (res: any, test: any, patient: any) => {
  if (res.refRangeText) return res.refRangeText;
  if (res.refRangeMin !== null && res.refRangeMax !== null)
    return `${res.refRangeMin} - ${res.refRangeMax}`;
  return "";
};

export default function ClinicalReportPage() {
  const params = useParams();
  const id = params.id as string;

  const [isDownloading, setIsDownloading] = useState(false);
  const [verificationUrl, setVerificationUrl] = useState("");

  const { data: patient, isLoading } = useQuery({
    queryKey: ["report", id],
    queryFn: () => fetchReportData(id),
  });

  useEffect(() => {
    setVerificationUrl(`${window.location.origin}/verify/${id}`);
  }, [id]);

  if (isLoading)
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="animate-spin h-8 w-8 text-blue-600" />
      </div>
    );
  if (!patient)
    return (
      <div className="p-10 text-center text-red-500">Report not found</div>
    );

  const validTests =
    patient.tests?.filter((t: any) => t.status !== "PENDING") || [];
  if (validTests.length === 0)
    return (
      <div className="p-10 text-center text-slate-500">
        No completed tests available.
      </div>
    );

  const activeTemplate = patient.lab?.reportTemplates?.[0];
  const config = getSafeConfig(activeTemplate);
  const {
    primaryColor,
    secondaryColor,
    globalFontSize,
    fontFamily,
    watermarkUrl,
    watermarkOpacity,
  } = config.branding;
  const pb = config.patientBlock;

  // --- DYNAMIC TIMESTAMPS & VARIABLES ---
  const primaryTest = validTests[0];
  const barcodeValue =
    primaryTest?.sample?.sampleId || patient.patientId || "UNKNOWN";
  const refDoctorName =
    primaryTest?.doctor?.user?.name || primaryTest?.referredBy || "Self";
  const agencyName = primaryTest?.agency?.agencyName || "Self";

  const sampleCollectedAt = primaryTest?.sampleCollectedAt
    ? format(new Date(primaryTest.sampleCollectedAt), "dd/MM/yy HH:mm:ss")
    : "-";
  const sampleReceivedAt = primaryTest?.sampleReceivedAt
    ? format(new Date(primaryTest.sampleReceivedAt), "dd/MM/yy HH:mm:ss")
    : "-";
  const reportApprovedAt = primaryTest?.approvedAt
    ? format(new Date(primaryTest.approvedAt), "dd/MM/yy HH:mm:ss")
    : format(new Date(), "dd/MM/yy HH:mm:ss");

  // --- PDF DOWNLOAD TRIGGER ---
  const handleDownload = async () => {
    setIsDownloading(true);
    const toastId = toast.loading("Building High-Fidelity PDF Document...");
    try {
      // 1. Pre-generate QR Code as Base64 for the PDF engine
      const qrCodeDataUrl = await QRCode.toDataURL(verificationUrl, {
        margin: 0,
        color: { dark: "#0f172a", light: "#ffffff" },
      });

      // 2. Build Payload
      const payload = {
        patient,
        lab: patient.lab,
        validTests,
        config,
        qrCodeDataUrl,
        barcodeValue,
        timestamps: {
          collected: sampleCollectedAt,
          received: sampleReceivedAt,
          reported: reportApprovedAt,
          refDoctor: refDoctorName,
        },
      };

      // 3. Post to API
      const res = await fetch("/api/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to generate PDF");

      // 4. Force File Download with Patient Name & ID
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;

      const safeName = patient.name.replace(/[^a-zA-Z0-9]/g, "_").toUpperCase();
      const safeId = patient.patientId
        .replace(/[^a-zA-Z0-9]/g, "_")
        .toUpperCase();
      a.download = `Report_${safeName}_${safeId}.pdf`; // e.g., Report_JOHN_DOE_P_0001.pdf

      a.click();
      toast.success("PDF Download Complete!", { id: toastId });
    } catch (e) {
      toast.error("Failed to build PDF.", { id: toastId });
    }
    setIsDownloading(false);
  };

  // --- PREVIEW QR COMPONENT ---
  const PreviewQR = ({ position }: { position: string }) => {
    const [qrDataUrl, setQrDataUrl] = useState("");
    useEffect(() => {
      if (config.qrCode.show && verificationUrl) {
        QRCode.toDataURL(verificationUrl, {
          margin: 0,
          width: config.qrCode.size - 8,
          color: { dark: "#0f172a", light: "#ffffff" },
        }).then(setQrDataUrl);
      }
    }, [verificationUrl]);

    if (!config.qrCode.show || !qrDataUrl) return null;
    const isCustom = config.qrCode.mode === "custom";
    if (!isCustom && config.qrCode.position !== position) return null;
    if (isCustom && position !== "custom") return null;

    const qrContent = (
      <div
        className="flex flex-col items-center bg-white p-1 border shadow-sm"
        style={{
          width: config.qrCode.size,
          height: config.qrCode.size + (config.qrCode.showPageNumber ? 15 : 0),
        }}>
        <img
          src={qrDataUrl}
          alt="QR"
          style={{
            width: config.qrCode.size - 8,
            height: config.qrCode.size - 8,
          }}
        />
        {config.qrCode.showPageNumber && (
          <span className="text-[8px] mt-1 font-bold text-slate-800 whitespace-nowrap">
            Page 1 of 1
          </span>
        )}
      </div>
    );

    if (isCustom)
      return (
        <div
          style={{
            position: "absolute",
            zIndex: 50,
            left: config.qrCode.x,
            top: config.qrCode.y,
          }}>
          {qrContent}
        </div>
      );
    return qrContent;
  };

  const m = config.layout.margins;

  return (
    <div className="flex flex-col items-center py-10 bg-slate-900 min-h-screen">
      {/* ============================================================== */}
      {/* TOP ACTION BAR                                                 */}
      {/* ============================================================== */}
      <div className="w-[210mm] flex justify-between items-center mb-6 sticky top-4 z-50 bg-white/95 backdrop-blur-md p-4 rounded-xl shadow-xl border border-slate-200">
        <div className="flex items-center gap-3">
          <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
            <FileText size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Report Preview</h1>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-widest">
              {patient.patientId}
            </p>
          </div>
        </div>

        <Button
          size="lg"
          className="bg-blue-600 hover:bg-blue-700 text-white shadow-md transition-all h-12 px-6 rounded-xl font-bold text-md"
          onClick={handleDownload}
          disabled={isDownloading}>
          {isDownloading ? (
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
          ) : (
            <Download className="h-5 w-5 mr-2" />
          )}
          Download Official PDF
        </Button>
      </div>

      <p className="text-slate-400 text-sm mb-6 flex items-center">
        Showing visual preview of Page 1. Click download to generate the
        paginated PDF.
      </p>

      {/* ============================================================== */}
      {/* A4 REPORT PREVIEW CANVAS                                       */}
      {/* ============================================================== */}
      <div
        style={{
          fontFamily: fontFamily,
          fontSize: `${globalFontSize}px`,
          width: "210mm",
          minHeight: "297mm",
          padding: `${m.top}mm ${m.right}mm ${m.bottom}mm ${m.left}mm`,
          color: "#1e293b",
          boxSizing: "border-box",
        }}
        className="bg-white shadow-[0_20px_50px_rgba(0,0,0,0.3)] relative flex flex-col mx-auto overflow-hidden rounded-sm">
        {/* Dynamic Border */}
        {config.layout.border.show && (
          <div
            className="absolute pointer-events-none"
            style={{
              top: config.layout.border.padding,
              bottom: config.layout.border.padding,
              left: config.layout.border.padding,
              right: config.layout.border.padding,
              border: `${config.layout.border.weight}px solid ${config.layout.border.color}`,
              zIndex: 10,
              boxSizing: "border-box",
            }}
          />
        )}

        {/* Dynamic Watermark */}
        {watermarkUrl && (
          <div
            className="pointer-events-none flex items-center justify-center z-0 absolute inset-0"
            style={{ opacity: watermarkOpacity }}>
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

        <PreviewQR position="custom" />

        <div className="w-full bg-transparent z-10 relative flex-1 flex flex-col">
          {/* --- PREVIEW HEADER --- */}
          {config.header.show && (
            <div
              className={`w-full mb-4 pb-4 ${config.header.mode === "image" ? "" : "border-b-[3px]"}`}
              style={{ borderBottomColor: primaryColor }}>
              {config.header.mode === "image" && config.header.fullImage ? (
                <div
                  className="w-full overflow-hidden"
                  style={{ height: `${config.header.height || 150}px` }}>
                  <img
                    src={config.header.fullImage}
                    className="w-full h-full object-cover"
                    alt="Header"
                  />
                </div>
              ) : config.header.mode === "html" ? (
                <div dangerouslySetInnerHTML={{ __html: config.header.html }} />
              ) : (
                <div className="flex justify-between items-start w-full mt-2">
                  {/* Left QR */}
                  <div className="shrink-0 mr-4">
                    <PreviewQR position="header-left" />
                  </div>

                  <div className="flex-1 flex items-center justify-center">
                    {config.header.logoUrl ? (
                      <img
                        src={config.header.logoUrl}
                        className="h-16 w-auto object-contain mr-4"
                        alt="Logo"
                      />
                    ) : (
                      <div className="h-16 w-16 mr-4 bg-slate-50 flex items-center justify-center border font-bold rounded text-slate-400">
                        {patient.lab?.name?.charAt(0) || "L"}
                      </div>
                    )}
                    <div>
                      <h1
                        className="text-2xl font-bold uppercase tracking-wide"
                        style={{ color: primaryColor }}>
                        {config.header.title || patient.lab?.name}
                      </h1>
                      <p
                        className="text-sm font-medium"
                        style={{ color: secondaryColor }}>
                        {config.header.subTitle}
                      </p>
                    </div>
                  </div>

                  {/* Right QR */}
                  <div className="shrink-0 ml-4">
                    <PreviewQR position="header-right" />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* --- PREVIEW PATIENT BLOCK --- */}
          {pb.show && (
            <div
              className={`mb-6 ${config.header.mode === "image" ? "px-6" : ""}`}
              style={{ fontSize: `${pb.fontSize || 12}px` }}>
              <div className="flex justify-between items-start mb-4 mt-2">
                {pb.barcode.show && (
                  <div
                    style={{
                      textAlign: pb.barcode.position as any,
                      width: "100%",
                    }}>
                    <div
                      className="inline-block"
                      style={{
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
                        displayValue={true}
                        margin={0}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div
                className="grid grid-cols-2 gap-x-8 gap-y-1 border-b pb-4"
                style={{ borderColor: primaryColor }}>
                <div className="space-y-1.5">
                  {pb.showName && (
                    <div className="flex">
                      <span
                        className="w-28 font-bold"
                        style={{ color: secondaryColor }}>
                        Patient Name
                      </span>
                      <span className="font-bold uppercase">
                        : {patient.name}
                      </span>
                    </div>
                  )}
                  {pb.showPatientId && (
                    <div className="flex">
                      <span
                        className="w-28 font-bold"
                        style={{ color: secondaryColor }}>
                        Patient ID
                      </span>
                      <span>: {patient.patientId}</span>
                    </div>
                  )}
                  {pb.showSentBy && (
                    <div className="flex">
                      <span
                        className="w-28 font-bold"
                        style={{ color: secondaryColor }}>
                        Sent By
                      </span>
                      <span className="truncate uppercase">: {agencyName}</span>
                    </div>
                  )}
                </div>
                <div className="space-y-1.5">
                  {pb.showAgeSex && (
                    <div className="flex">
                      <span
                        className="w-32 font-bold"
                        style={{ color: secondaryColor }}>
                        Age / Gender
                      </span>
                      <span className="font-bold">
                        : {patient.age} {patient.ageUnit} / {patient.gender}
                      </span>
                    </div>
                  )}
                  {pb.showEmployeeId && (
                    <div className="flex">
                      <span
                        className="w-32 font-bold"
                        style={{ color: secondaryColor }}>
                        Employee ID
                      </span>
                      <span>: {patient.employeeId || "-"}</span>
                    </div>
                  )}
                  {pb.showRefDoctor && (
                    <div className="flex">
                      <span
                        className="w-32 font-bold"
                        style={{ color: secondaryColor }}>
                        Ref. Doctor
                      </span>
                      <span className="uppercase">: {refDoctorName}</span>
                    </div>
                  )}
                  {pb.showSampleCollection && (
                    <div className="flex">
                      <span
                        className="w-32 font-bold"
                        style={{ color: secondaryColor }}>
                        Collected
                      </span>
                      <span>: {sampleCollectedAt}</span>
                    </div>
                  )}
                  {pb.showReportReleased && (
                    <div className="flex">
                      <span
                        className="w-32 font-bold"
                        style={{ color: secondaryColor }}>
                        Reported
                      </span>
                      <span>: {reportApprovedAt}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* --- PREVIEW RESULTS (Abridged for visual representation) --- */}
          <div
            className={`flex-1 ${config.header.mode === "image" ? "px-6" : ""}`}>
            {config.body.map((block: any) => {
              if (block.type === "RESULTS_TABLE") {
                return (
                  <div key={block.id}>
                    {validTests.map((test: any) => {
                      if (!test.results || test.results.length === 0)
                        return null;
                      return (
                        <div key={test.id} className="mb-6 w-full">
                          {config.bodyOptions?.groupDepartmentWise &&
                            test.testTemplate?.department?.name && (
                              <div className="bg-slate-100 font-bold py-1.5 px-3 mb-4 text-[12px] uppercase text-center border-y border-slate-300 tracking-wider">
                                {test.testTemplate.department.name}
                              </div>
                            )}
                          <h2
                            className="text-center font-bold text-lg mb-4 underline uppercase tracking-wide"
                            style={{ color: primaryColor }}>
                            {test.testName}
                          </h2>
                          <table
                            className="w-full border-collapse"
                            style={{
                              fontSize: `${config.bodyOptions.tableFontSize || 11}px`,
                            }}>
                            <thead
                              className="border-y-2 text-left"
                              style={{ borderColor: primaryColor }}>
                              <tr>
                                <th className="py-2.5 px-1 font-bold w-2/5">
                                  Test Parameter
                                </th>
                                <th className="py-2.5 px-1 font-bold w-1/5">
                                  Result
                                </th>
                                <th className="py-2.5 px-1 font-bold w-1/5">
                                  Unit
                                </th>
                                {config.bodyOptions.showBiologicalRef && (
                                  <th className="py-2.5 px-1 font-bold w-1/5">
                                    Bio. Ref. Range
                                  </th>
                                )}
                              </tr>
                            </thead>
                            <tbody>
                              {test.results.map((res: any) => (
                                <tr
                                  key={res.id}
                                  className="border-b border-slate-100">
                                  <td className="py-2.5 px-1 font-medium">
                                    {res.parameterName}
                                  </td>
                                  <td
                                    className={`py-2.5 px-1 font-bold ${res.isAbnormal ? "text-red-600" : "text-slate-900"}`}>
                                    {res.value} {res.isAbnormal && "*"}
                                  </td>
                                  <td className="py-2.5 px-1 text-slate-500">
                                    {res.unit}
                                  </td>
                                  {config.bodyOptions.showBiologicalRef && (
                                    <td className="py-2.5 px-1 text-slate-500 whitespace-pre-wrap leading-tight">
                                      {getReferenceRange(res, test, patient)}
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
              if (block.type === "SPACER")
                return (
                  <div
                    key={block.id}
                    style={{ height: `${block.height || 20}px` }}></div>
                );
              if (block.type === "IMAGE" && block.imageUrl)
                return (
                  <div key={block.id} className="flex justify-center mb-4">
                    <img
                      src={block.imageUrl}
                      style={{
                        width: `${block.imageScale || 100}%`,
                        objectFit: "contain",
                      }}
                    />
                  </div>
                );
              return null;
            })}
          </div>

          {/* --- PREVIEW FOOTER --- */}
          {config.footer.show && (
            <div
              className={`w-full mt-auto pt-4 pb-2 relative ${config.footer.mode === "image" ? "" : "border-t-2"}`}
              style={{ borderTopColor: primaryColor }}>
              {config.footer.mode === "image" && config.footer.fullImage ? (
                <div
                  className="w-full overflow-hidden"
                  style={{ height: `${config.footer.height || 100}px` }}>
                  <img
                    src={config.footer.fullImage}
                    className="w-full h-full object-cover"
                    alt="Footer"
                  />
                </div>
              ) : config.footer.mode === "html" ? (
                <div dangerouslySetInnerHTML={{ __html: config.footer.html }} />
              ) : (
                <div className="w-full flex flex-col items-center">
                  <div className="flex justify-between items-end w-full mb-4 px-10 relative">
                    <div className="shrink-0 mr-4">
                      <PreviewQR position="footer-left" />
                    </div>
                    <div className="flex-1 flex justify-around items-end px-4">
                      {config.footer.signatures?.map(
                        (sig: any, idx: number) =>
                          sig.show && (
                            <div
                              key={idx}
                              className="flex flex-col items-center"
                              style={{ width: `${sig.width}px` }}>
                              <div className="h-12 flex items-end justify-center mb-1">
                                {sig.imageUrl && (
                                  <img
                                    src={sig.imageUrl}
                                    className="h-full object-contain"
                                    alt="Sig"
                                  />
                                )}
                              </div>
                              <div className="w-full text-center border-t border-slate-300 pt-1">
                                <p className="font-bold text-[11px] text-slate-900 whitespace-nowrap">
                                  {sig.name}
                                </p>
                                <p className="text-[9px] text-slate-600 whitespace-nowrap">
                                  {sig.qualifications}
                                </p>
                                <p className="font-bold text-[9px] text-slate-800 uppercase mt-0.5 whitespace-nowrap">
                                  {sig.title}
                                </p>
                              </div>
                            </div>
                          ),
                      )}
                    </div>
                    <div className="shrink-0 ml-4">
                      <PreviewQR position="footer-right" />
                    </div>
                  </div>
                </div>
              )}
              <div
                className="text-[9px] text-center mt-4 pb-2 pt-2 border-t border-slate-200"
                style={{ color: secondaryColor }}
                dangerouslySetInnerHTML={{ __html: config.footer.text || "" }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
