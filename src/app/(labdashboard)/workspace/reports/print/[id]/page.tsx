"use client";

import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Loader2, Printer, Download, Save, PencilRuler } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRef, useState, useEffect } from "react";
import toast from "react-hot-toast";
import Barcode from "react-barcode";
import QRCode from "qrcode";
import { Rnd } from "react-rnd";

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
      text: "**Sample has been collected outside the laboratory. The results pertain to the sample received.",
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

// --- 3. REFERENCE RANGE HELPER ---
const getReferenceRange = (res: any, test: any, patient: any) => {
  if (res.refRangeText) return res.refRangeText;
  if (res.refRangeMin !== null && res.refRangeMax !== null)
    return `${res.refRangeMin} - ${res.refRangeMax}`;

  const paramDef = test.testTemplate?.parameters?.find(
    (p: any) => p.parameter.name === res.parameterName,
  );
  if (paramDef?.parameter?.referenceRanges) {
    const ranges = paramDef.parameter.referenceRanges;
    const gender = patient.gender?.toUpperCase();

    const match =
      ranges.find((r: any) => r.gender === gender) ||
      ranges.find((r: any) => r.gender === "BOTH") ||
      ranges[0];

    if (match) {
      if (match.textValue) return match.textValue;
      const label = match.customLabel ? `${match.customLabel}: ` : "";
      if (match.lowValue !== null && match.highValue !== null) {
        return `${label}${match.lowValue} - ${match.highValue}`;
      }
    }
  }
  return "";
};

export default function ClinicalReportPage() {
  const params = useParams();
  const id = params.id as string;
  const queryClient = useQueryClient();

  const [isDownloading, setIsDownloading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [localLayouts, setLocalLayouts] = useState<Record<string, any>>({});
  const [verificationUrl, setVerificationUrl] = useState("");
  const reportRef = useRef<HTMLDivElement>(null);

  const { data: patient, isLoading } = useQuery({
    queryKey: ["report", id],
    queryFn: () => fetchReportData(id),
  });

  useEffect(() => {
    setVerificationUrl(`${window.location.origin}/verify/${id}`);

    if (patient?.tests) {
      const initialLayouts: any = {};
      patient.tests.forEach((t: any) => {
        t.customResults?.forEach((cr: any) => {
          const key = `${t.id}_${cr.fieldDefId}`;
          initialLayouts[key] = cr.layout || {
            x: 40,
            y: 50,
            width: 300,
            height: 150,
          };
        });
      });
      setLocalLayouts(initialLayouts);
    }
  }, [patient, id]);

  const saveLayoutMutation = useMutation({
    mutationFn: async () => {
      const promises = patient.tests.map(async (test: any) => {
        const customPayload = test.customResults.map((cr: any) => {
          const key = `${test.id}_${cr.fieldDefId}`;
          return {
            fieldDefId: cr.fieldDefId,
            value: cr.value,
            layout: localLayouts[key],
          };
        });
        return fetch(`/api/workspace/workflow/results/${id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            testId: test.id,
            customResults: customPayload,
          }),
        });
      });
      await Promise.all(promises);
    },
    onSuccess: () => {
      toast.success("Report layout saved!");
      setIsEditMode(false);
      queryClient.invalidateQueries({ queryKey: ["report", id] });
    },
    onError: () => toast.error("Failed to save layout"),
  });

  const handleDownload = () => {
    setIsDownloading(true);
    toast("Preparing Professional PDF...", { icon: "⚙️" });

    setTimeout(() => {
      toast.success("Please select 'Save as PDF' in the print dialog.", {
        duration: 4000,
      });
      window.print();
      setIsDownloading(false);
    }, 1000);
  };

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
    patient.tests?.filter(
      (t: any) =>
        (t.results.length > 0 || t.customResults.length > 0) &&
        t.status !== "PENDING",
    ) || [];
  if (validTests.length === 0)
    return (
      <div className="p-10 text-center text-slate-500">
        No completed tests available to print.
      </div>
    );

  const activeTemplate = patient.lab?.reportTemplates?.[0];
  const config = getSafeConfig(activeTemplate);
  const primaryColor = config.branding.primaryColor;
  const secondaryColor = config.branding.secondaryColor;
  const patientBlockConfig = config.patientBlock;

  const primaryTest = validTests[0];
  const invoiceId = primaryTest?.invoiceId;
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

  const compileText = (text: string) => {
    if (!text) return "";
    let compiled = text;
    compiled = compiled.replace(/\{\{patient\.name\}\}/g, patient.name || "");
    compiled = compiled.replace(
      /\{\{patient\.age\}\}/g,
      `${patient.age} ${patient.ageUnit}` || "",
    );
    compiled = compiled.replace(
      /\{\{patient\.gender\}\}/g,
      patient.gender || "",
    );
    compiled = compiled.replace(
      /\{\{patient\.patientId\}\}/g,
      patient.patientId || "",
    );
    compiled = compiled.replace(
      /\{\{sample\.sampleId\}\}/g,
      primaryTest?.sample?.sampleId || "",
    );
    compiled = compiled.replace(
      /\{\{sample\.collectedAt\}\}/g,
      sampleCollectedAt,
    );
    compiled = compiled.replace(/\{\{doctor\.name\}\}/g, refDoctorName);
    return compiled;
  };

  const tfootSpacerHeight =
    config.footer.mode === "image" ? (config.footer.height || 100) + 30 : 180;

  const m = config.layout.margins;
  const marginStr = `${m.top}mm ${m.right}mm ${m.bottom}mm ${m.left}mm`;

  const VerificationQR = ({ position }: { position: string }) => {
    const [qrDataUrl, setQrDataUrl] = useState("");

    useEffect(() => {
      if (config.qrCode.show && verificationUrl) {
        QRCode.toDataURL(verificationUrl, {
          margin: 0,
          width: config.qrCode.size - 8,
          color: { dark: "#0f172a", light: "#ffffff" },
        })
          .then(setQrDataUrl)
          .catch(console.error);
      }
    }, [config.qrCode.show, verificationUrl, config.qrCode.size]);

    if (!config.qrCode.show || !verificationUrl || !qrDataUrl) return null;

    const isCustom = config.qrCode.mode === "custom";
    if (!isCustom && config.qrCode.position !== position) return null;
    if (isCustom && position !== "custom") return null;

    const qrContent = (
      <div
        className="flex flex-col items-center bg-white p-1 border shadow-sm print:shadow-none"
        style={{
          width: config.qrCode.size,
          height: config.qrCode.size + (config.qrCode.showPageNumber ? 15 : 0),
        }}>
        <img
          src={qrDataUrl}
          alt="QR Code"
          style={{
            width: config.qrCode.size - 8,
            height: config.qrCode.size - 8,
          }}
        />
        {config.qrCode.showPageNumber && (
          <span className="text-[8px] mt-1 font-bold text-slate-500 whitespace-nowrap">
            Page 1 of 1
          </span>
        )}
      </div>
    );

    if (isCustom && !isEditMode) {
      const qrStyle: any = { position: "absolute", zIndex: 50 };
      qrStyle.left = config.qrCode.x;
      qrStyle.top = config.qrCode.y;
      return <div style={qrStyle}>{qrContent}</div>;
    }

    if (isCustom && isEditMode) {
      return (
        <Rnd
          size={{ width: config.qrCode.size, height: "auto" }}
          position={{ x: config.qrCode.x, y: config.qrCode.y }}
          bounds="parent"
          className="z-50 border-2 border-dashed border-blue-500 bg-blue-50/50 hover:cursor-move flex flex-col items-center justify-center">
          {qrContent}
        </Rnd>
      );
    }

    const qrStyle: any = { position: "absolute", zIndex: 50 };
    if (position.includes("header"))
      qrStyle.top = `calc(${m.top}mm + ${config.qrCode.margin}px)`;
    if (position.includes("footer"))
      qrStyle.bottom = `calc(${m.bottom}mm + ${config.qrCode.margin}px)`;
    if (position.includes("left"))
      qrStyle.left = `calc(${m.left}mm + ${config.qrCode.margin}px)`;
    if (position.includes("right"))
      qrStyle.right = `calc(${m.right}mm + ${config.qrCode.margin}px)`;

    return <div style={qrStyle}>{qrContent}</div>;
  };

  return (
    <div className="flex flex-col items-center py-8 bg-slate-100 min-h-screen print:bg-white print:p-0">
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 5mm 0mm;
          }
          html,
          body {
            background: white !important;
            -webkit-print-color-adjust: exact;
            margin: 0;
            padding: 0;
            height: auto;
          }
          body * {
            visibility: hidden;
          }
          #report-container,
          #report-container * {
            visibility: visible;
          }
          #report-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            display: block !important;
            min-height: 0 !important;
            box-shadow: none !important;
          }
          table {
            width: 100%;
            border-collapse: collapse;
          }
          thead {
            display: table-header-group;
          }
          tfoot {
            display: table-footer-group;
          }
          tr {
            page-break-inside: avoid;
          }
          .no-print {
            display: none !important;
          }
          #real-footer {
            position: fixed !important;
            bottom: 0 !important;
            left: 0 !important;
            width: 100% !important;
            background: transparent !important;
            z-index: 100 !important;
          }
        }
      `}</style>

      {/* ACTION BAR */}
      <div className="w-[210mm] flex justify-between items-center mb-6 print:hidden sticky top-4 z-50 bg-white/90 backdrop-blur p-4 rounded-xl shadow-lg border border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Final Report</h1>
          <p className="text-xs text-slate-500">
            {isEditMode ? (
              <span className="text-blue-600 font-bold animate-pulse">
                EDIT MODE ACTIVE
              </span>
            ) : (
              `${validTests.length} tests ready`
            )}
          </p>
        </div>
        <div className="flex gap-2">
          {invoiceId && (
            <Button
              variant="outline"
              className="bg-white"
              onClick={() =>
                window.open(
                  `/workspace/print/barcodes?invoiceId=${invoiceId}`,
                  "_blank",
                )
              }>
              <Barcode className="h-4 w-4 mr-2" /> Barcodes
            </Button>
          )}
          <Button
            variant={isEditMode ? "default" : "outline"}
            className={
              isEditMode
                ? "bg-blue-600 hover:bg-blue-700 text-white"
                : "bg-white text-slate-700"
            }
            onClick={() =>
              isEditMode ? saveLayoutMutation.mutate() : setIsEditMode(true)
            }
            disabled={saveLayoutMutation.isPending}>
            {saveLayoutMutation.isPending ? (
              <Loader2 className="animate-spin h-4 w-4 mr-2" />
            ) : isEditMode ? (
              <Save className="h-4 w-4 mr-2" />
            ) : (
              <PencilRuler className="h-4 w-4 mr-2" />
            )}
            {isEditMode ? "Save Layout" : "Adjust Layout"}
          </Button>
          <Button
            variant="outline"
            className="bg-white"
            onClick={handleDownload}
            disabled={isDownloading || isEditMode}>
            {isDownloading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}{" "}
            PDF
          </Button>
          <Button
            className="bg-slate-900 hover:bg-slate-800"
            onClick={() => window.print()}
            disabled={isEditMode}>
            <Printer className="h-4 w-4 mr-2" /> Print
          </Button>
        </div>
      </div>

      {/* A4 CANVAS */}
      <div
        id="report-container"
        ref={reportRef}
        style={{
          fontFamily: config.branding.fontFamily,
          fontSize: `${config.branding.globalFontSize}px`,
          width: "210mm",
          minHeight: "297mm",
          padding: marginStr,
          color: "#1e293b",
        }}
        className="bg-white shadow-2xl print:shadow-none relative flex flex-col transition-all duration-300 overflow-hidden mx-auto">
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
            }}></div>
        )}

        {config.branding.watermarkUrl && (
          <div className="absolute inset-0 z-0 pointer-events-none flex items-center justify-center opacity-[0.05]">
            <img
              src={config.branding.watermarkUrl}
              style={{
                opacity: config.branding.watermarkOpacity,
                maxWidth: "80%",
                maxHeight: "80%",
                objectFit: "contain",
              }}
              alt="watermark"
            />
          </div>
        )}

        <VerificationQR position="header-right" />
        <VerificationQR position="header-left" />
        <VerificationQR position="footer-right" />
        <VerificationQR position="footer-left" />
        <VerificationQR position="custom" />

        <table className="w-full bg-transparent z-10 relative">
          <thead className="w-full bg-transparent">
            <tr>
              <td className="w-full pb-2">
                <div
                  className={`w-full ${config.header.mode === "image" ? "" : "px-8"}`}>
                  {config.header.show && (
                    <div
                      className={`w-full mb-4 pb-4 ${config.header.mode === "image" ? "" : "border-b-[3px]"}`}
                      style={{ borderBottomColor: primaryColor }}>
                      {config.header.mode === "image" &&
                      config.header.fullImage ? (
                        <div
                          className="w-full overflow-hidden"
                          style={{
                            height: `${config.header.height || 150}px`,
                          }}>
                          <img
                            src={config.header.fullImage}
                            className="w-full h-full object-cover"
                            alt="Header"
                          />
                        </div>
                      ) : config.header.mode === "html" ? (
                        <div
                          className="w-full"
                          dangerouslySetInnerHTML={{
                            __html: config.header.html,
                          }}
                        />
                      ) : (
                        <div className="flex items-center relative pr-[80px]">
                          {config.header.logoUrl ? (
                            <img
                              src={config.header.logoUrl}
                              className="h-16 w-auto object-contain"
                              alt="Logo"
                            />
                          ) : (
                            <div className="h-16 w-32 bg-slate-100 border rounded flex items-center justify-center text-xs text-slate-400">
                              Logo
                            </div>
                          )}
                          <div className="flex-1 px-4">
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
                      )}
                    </div>
                  )}

                  {patientBlockConfig.show && (
                    <div
                      className={`mb-6 break-inside-avoid ${config.header.mode === "image" ? "px-10" : ""}`}
                      style={{
                        fontSize: `${patientBlockConfig.fontSize || 12}px`,
                      }}>
                      {patientBlockConfig.barcode.show && (
                        <div
                          className="mb-4 mt-2"
                          style={{
                            textAlign: patientBlockConfig.barcode
                              .position as any,
                          }}>
                          <div
                            className="inline-block"
                            style={{
                              transform: `scale(${patientBlockConfig.barcode.scale})`,
                              transformOrigin:
                                patientBlockConfig.barcode.position === "center"
                                  ? "center"
                                  : patientBlockConfig.barcode.position,
                            }}>
                            <Barcode
                              value={barcodeValue}
                              height={patientBlockConfig.barcode.height}
                              width={1.5}
                              fontSize={10}
                              displayValue={true}
                              margin={0}
                            />
                          </div>
                        </div>
                      )}

                      <div
                        className="grid grid-cols-2 gap-x-8 gap-y-1 border-b pb-4"
                        style={{ borderColor: primaryColor }}>
                        <div className="space-y-1.5">
                          {patientBlockConfig.showName && (
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
                          {patientBlockConfig.showPatientId && (
                            <div className="flex">
                              <span
                                className="w-28 font-bold"
                                style={{ color: secondaryColor }}>
                                Patient ID
                              </span>
                              <span>: {patient.patientId}</span>
                            </div>
                          )}
                          {patientBlockConfig.showSentBy && (
                            <div className="flex">
                              <span
                                className="w-28 font-bold"
                                style={{ color: secondaryColor }}>
                                Sent By
                              </span>
                              <span className="truncate uppercase">
                                : {agencyName}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="space-y-1.5">
                          {patientBlockConfig.showAgeSex && (
                            <div className="flex">
                              <span
                                className="w-32 font-bold"
                                style={{ color: secondaryColor }}>
                                Age / Gender
                              </span>
                              <span className="font-bold">
                                : {patient.age} {patient.ageUnit} /{" "}
                                {patient.gender}
                              </span>
                            </div>
                          )}
                          {patientBlockConfig.showEmployeeId && (
                            <div className="flex">
                              <span
                                className="w-32 font-bold"
                                style={{ color: secondaryColor }}>
                                Employee ID
                              </span>
                              <span>: {patient.employeeId || "-"}</span>
                            </div>
                          )}
                          {patientBlockConfig.showRefDoctor && (
                            <div className="flex">
                              <span
                                className="w-32 font-bold"
                                style={{ color: secondaryColor }}>
                                Ref. Doctor
                              </span>
                              <span className="uppercase">
                                : {refDoctorName}
                              </span>
                            </div>
                          )}
                          {patientBlockConfig.showSampleCollection && (
                            <div className="flex">
                              <span
                                className="w-32 font-bold"
                                style={{ color: secondaryColor }}>
                                Collected
                              </span>
                              <span>: {sampleCollectedAt}</span>
                            </div>
                          )}
                          {patientBlockConfig.showReportReleased && (
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
                </div>
              </td>
            </tr>
          </thead>

          <tfoot className="w-full hidden print:table-footer-group border-none">
            <tr>
              <td className="border-none p-0">
                <div style={{ height: `${tfootSpacerHeight}px` }}></div>
              </td>
            </tr>
          </tfoot>

          <tbody className="w-full z-0 relative">
            <tr>
              <td className="w-full p-0">
                <div
                  className={`py-2 pb-10 ${config.header.mode === "image" ? "px-10" : "px-8"}`}>
                  {config.body.map((block: any) => {
                    switch (block.type) {
                      case "RESULTS_TABLE":
                        return (
                          <div key={block.id}>
                            {validTests.map((test: any) => {
                              const hasResults =
                                test.results && test.results.length > 0;
                              const imageFields: any[] = [];
                              test.customResults?.forEach((cr: any) => {
                                const def =
                                  test.testTemplate?.customFields?.find(
                                    (cf: any) =>
                                      cf.fieldDef.id === cr.fieldDefId,
                                  )?.fieldDef;
                                if (def?.type === "IMAGE" && cr.value) {
                                  imageFields.push({
                                    def,
                                    value: cr.value,
                                    fieldDefId: def.id,
                                  });
                                }
                              });

                              return (
                                <div
                                  key={test.id}
                                  className="mb-6 break-inside-avoid relative w-full">
                                  {hasResults && (
                                    <>
                                      {config.bodyOptions
                                        ?.groupDepartmentWise &&
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
                                            {config.bodyOptions
                                              .showBiologicalRef && (
                                              <th className="py-2.5 px-1 font-bold w-1/5">
                                                Bio. Ref. Range
                                              </th>
                                            )}
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {test.results?.map((res: any) => {
                                            const rangeDisplay =
                                              getReferenceRange(
                                                res,
                                                test,
                                                patient,
                                              );
                                            return (
                                              <tr
                                                key={res.id}
                                                className="border-b border-slate-100">
                                                <td className="py-2.5 px-1 font-medium">
                                                  {res.parameterName}
                                                </td>
                                                <td
                                                  className={`py-2.5 px-1 font-bold ${res.isAbnormal ? "text-red-600" : "text-slate-900"}`}>
                                                  {res.value}{" "}
                                                  {res.isAbnormal && "*"}
                                                </td>
                                                <td className="py-2.5 px-1 text-slate-500">
                                                  {res.unit}
                                                </td>
                                                {config.bodyOptions
                                                  .showBiologicalRef && (
                                                  <td className="py-2.5 px-1 text-slate-500 whitespace-pre-wrap leading-tight">
                                                    {rangeDisplay}
                                                  </td>
                                                )}
                                              </tr>
                                            );
                                          })}
                                        </tbody>
                                      </table>
                                    </>
                                  )}

                                  {test.customResults?.map((cr: any) => {
                                    const def =
                                      test.testTemplate?.customFields?.find(
                                        (cf: any) =>
                                          cf.fieldDef.id === cr.fieldDefId,
                                      )?.fieldDef;
                                    if (
                                      def &&
                                      def.type === "RICH_TEXT" &&
                                      cr.value
                                    ) {
                                      return (
                                        <div
                                          key={cr.id}
                                          className="mt-4 break-inside-avoid">
                                          <h4 className="font-bold text-xs uppercase mb-1 text-slate-700 underline decoration-slate-300 underline-offset-2">
                                            {def.name}
                                          </h4>
                                          <div
                                            className="text-[13px] text-slate-800 leading-relaxed whitespace-pre-wrap"
                                            dangerouslySetInnerHTML={{
                                              __html: cr.value,
                                            }}
                                          />
                                        </div>
                                      );
                                    }
                                    return null;
                                  })}

                                  {imageFields.length > 0 && (
                                    <div
                                      className="relative w-full mt-4"
                                      style={{ minHeight: "200px" }}>
                                      {imageFields.map(
                                        ({ def, value, fieldDefId }) => {
                                          const key = `${test.id}_${fieldDefId}`;
                                          const layout = localLayouts[key] || {
                                            x: 0,
                                            y: 0,
                                            width: 300,
                                            height: 150,
                                          };
                                          return (
                                            <Rnd
                                              key={key}
                                              size={{
                                                width: layout.width,
                                                height: layout.height,
                                              }}
                                              position={{
                                                x: layout.x,
                                                y: layout.y,
                                              }}
                                              disableDragging={!isEditMode}
                                              enableResizing={isEditMode}
                                              onDragStop={(e, d) =>
                                                setLocalLayouts((prev) => ({
                                                  ...prev,
                                                  [key]: {
                                                    ...prev[key],
                                                    x: d.x,
                                                    y: d.y,
                                                  },
                                                }))
                                              }
                                              onResizeStop={(
                                                e,
                                                dir,
                                                ref,
                                                delta,
                                                pos,
                                              ) =>
                                                setLocalLayouts((prev) => ({
                                                  ...prev,
                                                  [key]: {
                                                    width: parseInt(
                                                      ref.style.width,
                                                    ),
                                                    height: parseInt(
                                                      ref.style.height,
                                                    ),
                                                    ...pos,
                                                  },
                                                }))
                                              }
                                              bounds="parent"
                                              className={`group ${isEditMode ? "border-2 border-dashed border-blue-400 bg-blue-50/10 z-50" : "z-0 relative"}`}
                                              style={
                                                !isEditMode
                                                  ? {
                                                      position: "relative",
                                                      transform: "none",
                                                      marginBottom: "10px",
                                                    }
                                                  : {}
                                              }>
                                              <div className="w-full h-full relative">
                                                <img
                                                  src={value}
                                                  alt={def.name}
                                                  className="w-full h-full object-contain"
                                                />
                                                {!isEditMode && (
                                                  <span className="text-[9px] font-bold text-slate-500 mt-1 block text-center uppercase">
                                                    {def.name}
                                                  </span>
                                                )}
                                              </div>
                                            </Rnd>
                                          );
                                        },
                                      )}
                                    </div>
                                  )}

                                  {config.bodyOptions?.showTestTimestamps && (
                                    <div className="mt-4 text-[10px] text-slate-500 italic space-y-1">
                                      {test.method && (
                                        <p>
                                          <span className="font-bold">
                                            Method:
                                          </span>{" "}
                                          {test.method}
                                        </p>
                                      )}
                                      {test.notes && (
                                        <p>
                                          <span className="font-bold">
                                            Notes:
                                          </span>{" "}
                                          {test.notes}
                                        </p>
                                      )}
                                      {test.impression && (
                                        <p>
                                          <span className="font-bold">
                                            Impression:
                                          </span>{" "}
                                          {test.impression}
                                        </p>
                                      )}
                                      <p>
                                        (Collected At: {sampleCollectedAt},
                                        Received At: {sampleReceivedAt},
                                        Reported At: {reportApprovedAt})
                                      </p>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        );
                      case "TEXT":
                        return (
                          <div
                            key={block.id}
                            className="whitespace-pre-wrap leading-relaxed mb-4 break-inside-avoid"
                            dangerouslySetInnerHTML={{
                              __html: compileText(block.content),
                            }}
                          />
                        );
                      case "SPACER":
                        return (
                          <div
                            key={block.id}
                            style={{ height: `${block.height || 20}px` }}></div>
                        );
                      case "IMAGE":
                        return (
                          <div
                            key={block.id}
                            className={`flex justify-center mb-4 ${!block.imageUrl ? "h-32 bg-slate-100 border border-dashed flex items-center justify-center text-slate-400" : ""}`}>
                            {block.imageUrl ? (
                              <img
                                src={block.imageUrl}
                                style={{
                                  width: `${block.imageScale || 100}%`,
                                  objectFit: "contain",
                                }}
                                alt="Content"
                              />
                            ) : (
                              "Image Block"
                            )}
                          </div>
                        );
                      default:
                        return null;
                    }
                  })}

                  <div className="text-center mt-auto mb-6 break-inside-avoid">
                    <span className="text-[10px] font-bold text-slate-400 border-t border-b border-slate-200 py-1 px-8 tracking-widest uppercase">
                      *** End of Report ***
                    </span>
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        {/* ============================================================== */}
        {/* 4. REAL VISIBLE FOOTER (Fixed to Bottom)                         */}
        {/* ============================================================== */}
        {config.footer.show && (
          <div
            id="real-footer"
            className={`w-full mt-auto print:fixed print:bottom-0 print:left-0 bg-transparent ${config.header.mode === "image" ? "" : "px-8"}`}>
            <div
              className={`pt-4 pb-2 bg-white relative ${config.footer.mode === "image" ? "" : "border-t-2"}`}
              style={{ borderTopColor: primaryColor }}>
              {config.footer.mode === "image" && config.footer.fullImage ? (
                <div
                  className="w-full overflow-hidden bg-white"
                  style={{ height: `${config.footer.height || 100}px` }}>
                  <img
                    src={config.footer.fullImage}
                    className="w-full h-full object-cover"
                    alt="Footer"
                  />
                </div>
              ) : config.footer.mode === "html" ? (
                <div
                  className="w-full bg-white"
                  dangerouslySetInnerHTML={{
                    __html:
                      config.footer.html ||
                      "<div class='text-center py-4'>Custom HTML Footer</div>",
                  }}
                />
              ) : (
                <div className="w-full flex flex-col items-center bg-white">
                  <div className="flex justify-around items-end w-full mb-4 px-10">
                    {Array.isArray(config.footer.signatures) &&
                      config.footer.signatures.map(
                        (sig: any, idx: number) =>
                          sig.show && (
                            <div
                              key={idx}
                              className="flex flex-col items-center"
                              style={{ width: `${sig.width}px` }}>
                              <div className="h-16 flex items-end justify-center mb-1">
                                {sig.imageUrl ? (
                                  <img
                                    src={sig.imageUrl}
                                    className="h-full object-contain"
                                    alt="Sig"
                                  />
                                ) : (
                                  <div className="h-8 w-24 border border-dashed border-slate-300 text-[10px] text-slate-400 flex items-center justify-center">
                                    Sig
                                  </div>
                                )}
                              </div>
                              <div className="w-full text-center border-t border-slate-300 pt-1">
                                <p className="font-bold text-[11px] text-slate-900 leading-tight whitespace-nowrap">
                                  {sig.name}
                                </p>
                                {sig.qualifications && (
                                  <p className="text-[9px] text-slate-600 leading-tight whitespace-nowrap">
                                    {sig.qualifications}
                                  </p>
                                )}
                                {sig.title && (
                                  <p className="font-bold text-[9px] text-slate-800 uppercase mt-0.5 whitespace-nowrap">
                                    {sig.title}
                                  </p>
                                )}
                              </div>
                            </div>
                          ),
                      )}
                  </div>
                  {config.footer.footerBottomImage && (
                    <div className="w-full flex justify-center mt-2 border-t border-slate-100 pt-3">
                      <img
                        src={config.footer.footerBottomImage}
                        className="max-h-16 object-contain"
                        alt="Accreditation"
                      />
                    </div>
                  )}
                </div>
              )}

              <div
                className="text-[9px] text-center mt-4 pb-2 pt-2 border-t border-slate-200 bg-white"
                style={{ color: secondaryColor }}
                dangerouslySetInnerHTML={{ __html: config.footer.text || "" }}
              />
            </div>
            <div className="text-[9px] text-center text-gray-400 pb-2 bg-white">
              Powered by Patholab.cloud
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
