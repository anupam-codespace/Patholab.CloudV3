"use client";

import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Loader2, Printer, Download, Save, PencilRuler } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRef, useState, useEffect } from "react";
import toast from "react-hot-toast";
import Barcode from "react-barcode";
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
    patientBlock: {
      showBarcode: true,
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
    body: config.body || [{ id: "fallback-2", type: "RESULTS_TABLE" }],
    footer: {
      show: true,
      mode: "standard",
      text: "**Sample has been collected outside the laboratory. The results pertain to the sample received.",
      isoMarkUrls: [],
      signatures: [],
      height: 100,
      ...config.footer,
    },
    branding: {
      primaryColor: "#000000",
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
  const reportRef = useRef<HTMLDivElement>(null);

  const { data: patient, isLoading } = useQuery({
    queryKey: ["report", id],
    queryFn: () => fetchReportData(id),
  });

  useEffect(() => {
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
  }, [patient]);

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

  // ✅ FIX 1: NATIVE PDF DOWNLOAD ENGINE
  // This uses the browser's C++ rendering engine to guarantee perfect headers/footers
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
  const patientBlockConfig = config.patientBlock;

  // Data Extraction
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

  // ✅ FIX 2: SAFER TFOOT SPACER HEIGHT
  // Ensures the invisible block is tall enough to prevent text from sliding under the footer
  const tfootSpacerHeight =
    config.footer.mode === "image" ? (config.footer.height || 100) + 30 : 180;

  return (
    <div className="flex flex-col items-center py-8 bg-slate-100 min-h-screen print:bg-white print:p-0">
      {/* ============================================================== */}
      {/* ENTERPRISE PRINT CSS: BULLETPROOF THEAD & TFOOT FIX            */}
      {/* ============================================================== */}
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

          /* Force Table Structure */
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

          /* Force Real footer to absolute bottom */
          #real-footer {
            position: fixed !important;
            bottom: 0 !important;
            left: 0 !important;
            width: 100% !important;
            background: white !important;
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

          {/* NATIVE PDF DOWNLOAD TRIGGER */}
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
        className="w-[210mm] min-h-[297mm] print:min-h-0 print:block flex flex-col bg-white shadow-2xl print:shadow-none relative text-slate-900 font-sans text-[13px] leading-tight mx-auto">
        <table className="w-full bg-white">
          {/* ============================================================== */}
          {/* 1. HEADER (Repeats on every print page natively via THEAD)     */}
          {/* ============================================================== */}
          <thead className="w-full bg-white z-10 relative">
            <tr>
              <td className="w-full pb-2">
                <div
                  className={`w-full bg-white ${config.header.mode === "image" ? "" : "px-8"}`}>
                  {/* --- Graphic Header --- */}
                  {config.header.show && (
                    <div
                      className="w-full mb-4 pb-4 border-b-2"
                      style={{ borderColor: primaryColor }}>
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
                        <div className="flex justify-between items-center mt-6">
                          <div className="flex gap-4 items-center">
                            {config.header.logoUrl ? (
                              <img
                                src={config.header.logoUrl}
                                className="h-16 w-auto object-contain"
                                alt="Logo"
                              />
                            ) : (
                              <div className="h-16 w-16 bg-slate-50 flex items-center justify-center border text-xl font-bold rounded text-slate-400">
                                {patient.lab?.name?.charAt(0) || "L"}
                              </div>
                            )}
                            <div>
                              <h1
                                className="text-2xl font-bold uppercase tracking-wide"
                                style={{ color: primaryColor }}>
                                {config.header.title || patient.lab?.name}
                              </h1>
                              <p className="text-sm font-medium text-slate-600">
                                {config.header.subTitle}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  {!config.header.show && (
                    <div
                      style={{
                        height: `${config.header.height || 150}px`,
                      }}></div>
                  )}

                  {/* --- Patient Details Block --- */}
                  <div
                    className={`mb-2 break-inside-avoid ${config.header.mode === "image" ? "px-10" : ""}`}>
                    {patientBlockConfig.showBarcode !== false && (
                      <div className="flex justify-between items-start mb-4 mt-2">
                        <div className="flex flex-col items-center">
                          <Barcode
                            value={barcodeValue}
                            height={35}
                            width={1.5}
                            fontSize={10}
                            displayValue={true}
                            margin={0}
                          />
                        </div>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-4 text-[13px] border-b pb-4 border-slate-300">
                      <div className="space-y-1.5">
                        {patientBlockConfig.showName !== false && (
                          <div className="grid grid-cols-[100px_auto]">
                            <span className="font-bold text-slate-600">
                              Name
                            </span>
                            <span className="font-bold uppercase">
                              : {patient.name}
                            </span>
                          </div>
                        )}
                        {patientBlockConfig.showPatientId !== false && (
                          <div className="grid grid-cols-[100px_auto]">
                            <span className="font-bold text-slate-600">
                              Patient ID
                            </span>
                            <span>: {patient.patientId}</span>
                          </div>
                        )}
                        {patientBlockConfig.showSentBy !== false && (
                          <div className="grid grid-cols-[100px_auto]">
                            <span className="font-bold text-slate-600">
                              Sent By
                            </span>
                            <span className="truncate uppercase">
                              : {agencyName}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        {patientBlockConfig.showAgeSex !== false && (
                          <div className="grid grid-cols-[140px_auto]">
                            <span className="font-bold text-slate-600">
                              Age/Sex
                            </span>
                            <span className="font-bold">
                              : {patient.age} {patient.ageUnit} /{" "}
                              {patient.gender}
                            </span>
                          </div>
                        )}
                        {patientBlockConfig.showEmployeeId !== false && (
                          <div className="grid grid-cols-[140px_auto]">
                            <span className="font-bold text-slate-600">
                              Employee ID
                            </span>
                            <span>: {patient.employeeId || "-"}</span>
                          </div>
                        )}
                        {patientBlockConfig.showRefDoctor !== false && (
                          <div className="grid grid-cols-[140px_auto]">
                            <span className="font-bold text-slate-600">
                              Ref. Doctor
                            </span>
                            <span className="uppercase">: {refDoctorName}</span>
                          </div>
                        )}
                        {patientBlockConfig.showSampleCollection !== false && (
                          <div className="grid grid-cols-[140px_auto]">
                            <span className="font-bold text-slate-600">
                              Sample Collection
                            </span>
                            <span>: {sampleCollectedAt}</span>
                          </div>
                        )}
                        {patientBlockConfig.showReportReleased !== false && (
                          <div className="grid grid-cols-[140px_auto]">
                            <span className="font-bold text-slate-600">
                              Report Released
                            </span>
                            <span>: {reportApprovedAt}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </td>
            </tr>
          </thead>

          {/* ============================================================== */}
          {/* 2. INVISIBLE TFOOTER (Reserves Safe Space)                       */}
          {/* ============================================================== */}
          <tfoot className="w-full hidden print:table-footer-group border-none">
            <tr>
              <td className="border-none p-0">
                <div style={{ height: `${tfootSpacerHeight}px` }}></div>
              </td>
            </tr>
          </tfoot>

          {/* ============================================================== */}
          {/* 3. MAIN BODY (Flows across pages)                              */}
          {/* ============================================================== */}
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
                                  className="mb-8 break-inside-avoid relative">
                                  {hasResults && (
                                    <>
                                      <h2
                                        className="text-center font-bold text-lg mb-4 underline uppercase tracking-wide"
                                        style={{ color: primaryColor }}>
                                        {test.testName}
                                      </h2>
                                      <table className="w-full text-[13px] mb-2">
                                        <thead>
                                          <tr
                                            className="border-b-2 border-t-2"
                                            style={{
                                              borderColor: primaryColor,
                                            }}>
                                            <th className="py-2 text-left w-2/5 font-bold">
                                              Test
                                            </th>
                                            <th className="py-2 text-left w-1/5 font-bold">
                                              Result
                                            </th>
                                            <th className="py-2 text-left w-1/5 font-bold">
                                              Unit
                                            </th>
                                            <th className="py-2 text-left w-1/5 font-bold">
                                              Biological Ref. Range
                                            </th>
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
                                                <td className="py-2 font-medium">
                                                  {res.parameterName}
                                                </td>
                                                <td
                                                  className={`py-2 font-bold ${res.isAbnormal ? "text-red-600" : "text-slate-900"}`}>
                                                  {res.value}{" "}
                                                  {res.isAbnormal && "*"}
                                                </td>
                                                <td className="py-2 text-slate-600">
                                                  {res.unit}
                                                </td>
                                                <td className="py-2 text-slate-600 whitespace-pre-wrap leading-tight">
                                                  {rangeDisplay}
                                                </td>
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

                                  <div className="mt-4 text-[12px] text-slate-700 space-y-1 break-inside-avoid">
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
                                    <p className="text-[10px] text-slate-500 mt-2 italic">
                                      (Collected At: {sampleCollectedAt},
                                      Received At: {sampleReceivedAt}, Reported
                                      At: {reportApprovedAt})
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );

                      case "TEXT":
                        return (
                          <div
                            key={block.id}
                            className="text-[13px] whitespace-pre-wrap leading-relaxed mb-4 break-inside-avoid"
                            dangerouslySetInnerHTML={{
                              __html: compileText(block.content),
                            }}
                          />
                        );

                      case "SPACER":
                        return (
                          <div key={block.id} style={{ height: "20px" }}></div>
                        );

                      default:
                        return null;
                    }
                  })}

                  <div className="text-center mt-8 mb-6 break-inside-avoid">
                    <span className="text-xs font-bold text-slate-400 border-t border-b border-slate-200 py-1 px-4 tracking-widest uppercase">
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
            className={`w-full mt-auto print:fixed print:bottom-0 print:left-0 bg-white ${config.header.mode === "image" ? "" : "px-8"}`}>
            <div
              className="border-t-2 pt-4 pb-2 bg-white"
              style={{ borderColor: primaryColor }}>
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
              ) : (
                <div className="w-full pb-4 bg-white">
                  <div className="flex justify-around items-end w-full">
                    {Array.isArray(config.footer.signatures) &&
                      config.footer.signatures.map(
                        (sig: any, idx: number) =>
                          sig.show && (
                            <div
                              key={idx}
                              className="flex flex-col items-center min-w-[150px] bg-white">
                              <div className="h-16 flex items-end justify-center mb-1">
                                {sig.imageUrl ? (
                                  <img
                                    src={sig.imageUrl}
                                    className="h-full object-contain"
                                    alt="Sig"
                                  />
                                ) : (
                                  <div className="h-8 w-24 border border-dashed border-slate-300 text-[10px] text-slate-400 flex items-center justify-center">
                                    Signature
                                  </div>
                                )}
                              </div>
                              <div className="w-full text-center bg-white">
                                <p className="font-bold text-[12px] text-slate-800">
                                  {sig.name}
                                </p>
                                <p className="text-[10px] text-slate-600 leading-tight">
                                  {sig.qualifications}
                                </p>
                                <p className="font-bold text-[10px] text-slate-800 uppercase mt-0.5">
                                  {sig.title}
                                </p>
                              </div>
                            </div>
                          ),
                      )}
                  </div>
                </div>
              )}

              {config.footer.text && (
                <div
                  className="text-[10px] text-slate-500 text-center w-full mt-2 pt-2 border-t border-slate-200 bg-white"
                  dangerouslySetInnerHTML={{ __html: config.footer.text }}
                />
              )}
            </div>

            <div className="text-[9px] text-center text-gray-400 pb-2 bg-white">
              Powered by  Patholab.cloud
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
