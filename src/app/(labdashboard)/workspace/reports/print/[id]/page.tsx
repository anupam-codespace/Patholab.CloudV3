"use client";

import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Loader2,
  Printer,
  Download,
  QrCode,
  Save,
  PencilRuler,
  FileText,
  ChevronLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRef, useState, useEffect } from "react";
import toast from "react-hot-toast";
import Barcode from "react-barcode";
import { Rnd } from "react-rnd";
import Link from "next/link";

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
      title: "LABORATORY REPORT",
      subTitle: "",
      logoUrl: "",
      html: "",
      height: 150,
      ...config.header,
    },
    footer: {
      show: true,
      mode: "standard",
      text: "",
      isoMarkUrls: [],
      signatures: [],
      height: 100,
      ...config.footer,
    },
    branding: {
      primaryColor: "#4f46e5", // Default Indigo
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

  const handleDownload = async () => {
    if (!reportRef.current) return;
    setIsDownloading(true);
    try {
      const html2pdf = (await import("html2pdf.js")).default;
      const opt = {
        margin: 5,
        filename: `LabReport_${patient?.name || "Patient"}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          letterRendering: true,
          windowWidth: 1024,
        },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        pagebreak: { mode: "css" },
      };
      await html2pdf().set(opt).from(reportRef.current).save();
      toast.success("Report downloaded");
    } catch (e) {
      toast.error("Download failed");
    } finally {
      setIsDownloading(false);
    }
  };

  if (isLoading)
    return (
      <div className="h-[calc(100vh-4rem)] flex flex-col items-center justify-center bg-slate-50 font-sans">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-600 mb-4" />
        <p className="text-sm font-bold text-slate-500 uppercase tracking-widest animate-pulse">
          Generating Document...
        </p>
      </div>
    );

  if (!patient)
    return (
      <div className="h-[calc(100vh-4rem)] flex flex-col items-center justify-center bg-slate-50 font-sans">
        <FileText className="h-12 w-12 text-rose-400 mb-4" />
        <h2 className="text-xl font-bold text-slate-800">Report Not Found</h2>
        <p className="text-slate-500 mb-6 max-w-md text-center">
          We could not locate this report in the system.
        </p>
        <Link href="/workspace/workflow/results">
          <Button variant="outline">
            <ChevronLeft className="h-4 w-4 mr-2" /> Back to Queue
          </Button>
        </Link>
      </div>
    );

  const validTests =
    patient.tests?.filter(
      (t: any) =>
        (t.results?.length > 0 || t.customResults?.length > 0) &&
        t.status !== "PENDING",
    ) || [];

  if (validTests.length === 0)
    return (
      <div className="h-[calc(100vh-4rem)] flex flex-col items-center justify-center bg-slate-50 font-sans">
        <FileText className="h-12 w-12 text-amber-400 mb-4" />
        <h2 className="text-xl font-bold text-slate-800">No Results Yet</h2>
        <p className="text-slate-500 mb-6 max-w-md text-center">
          There are no completed tests available to print for this patient.
        </p>
        <Link href="/workspace/workflow/results">
          <Button variant="outline">
            <ChevronLeft className="h-4 w-4 mr-2" /> Back to Queue
          </Button>
        </Link>
      </div>
    );

  const invoiceId = validTests[0]?.invoiceId;
  const activeTemplate =
    patient.lab?.reportTemplates?.find((t: any) => t.isActive) ||
    patient.lab?.reportTemplates?.[0];
  const config = getSafeConfig(activeTemplate);
  const primaryColor = config.branding.primaryColor;
  const barcodeValue = patient.patientId || "UNKNOWN";

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 font-sans relative pb-12 print:bg-white print:p-0 print:pb-0">
      {/* Decorative Background Mesh (Hidden in Print) */}
      <div className="absolute top-0 inset-x-0 h-64 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-100/40 via-slate-50 to-transparent pointer-events-none z-0 print:hidden" />

      {/* CSS TO FORCE HEADER/FOOTER REPEAT */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm 0mm;
          }
          html,
          body {
            background: white !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            margin: 0;
            padding: 0;
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
            box-shadow: none !important;
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
        }
      `}</style>

      <main className="max-w-[1000px] mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10 space-y-6 print:p-0 print:m-0 print:max-w-none">
        {/* NON-STICKY ACTION BAR (Responsive) */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-5 bg-white/70 backdrop-blur-xl p-5 rounded-2xl border border-slate-200/60 shadow-sm print:hidden">
          <div className="flex flex-col min-w-0">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight leading-tight truncate">
              Document Preview
            </h1>
            <p
              className={`text-xs font-bold mt-1 uppercase tracking-wider ${isEditMode ? "text-indigo-600 animate-pulse" : "text-emerald-600"}`}>
              {isEditMode
                ? "EDIT MODE ACTIVE"
                : `${validTests.length} TESTS VERIFIED`}
            </p>
          </div>

          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            {invoiceId && (
              <Button
                variant="outline"
                className="h-11 rounded-xl bg-white border-slate-200 text-slate-700 font-bold flex-1 sm:flex-none"
                onClick={() =>
                  window.open(
                    `/workspace/print/barcodes?invoiceId=${invoiceId}`,
                    "_blank",
                  )
                }>
                <QrCode className="h-4 w-4 mr-2" /> Barcodes
              </Button>
            )}

            <Button
              variant={isEditMode ? "default" : "outline"}
              className={`h-11 rounded-xl font-bold flex-1 sm:flex-none ${
                isEditMode
                  ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/25 border-none"
                  : "bg-white text-slate-700 border-slate-200"
              }`}
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
              className="h-11 rounded-xl bg-white border-slate-200 text-slate-700 font-bold flex-1 sm:flex-none"
              onClick={handleDownload}
              disabled={isDownloading || isEditMode}>
              {isDownloading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Download PDF
            </Button>

            <Button
              className="h-11 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold shadow-md flex-1 sm:flex-none"
              onClick={() => window.print()}
              disabled={isEditMode}>
              <Printer className="h-4 w-4 mr-2" /> Print Report
            </Button>
          </div>
        </div>

        {/* THE RESPONSIVE REPORT WRAPPER */}
        <div className="w-full overflow-x-auto custom-scrollbar rounded-2xl bg-slate-200/50 p-4 sm:p-8 block border border-slate-200/60 print:block print:p-0 print:border-none print:bg-transparent">
          {/* THE A4 DOCUMENT (Locked Web Width, Fluid Print Width) */}
          <div
            id="report-container"
            ref={reportRef}
            className="w-[794px] min-w-[794px] max-w-[794px] shrink-0 bg-white shadow-2xl print:shadow-none print:w-full print:min-w-0 print:max-w-none relative text-slate-900 font-sans text-sm leading-relaxed mx-auto origin-top">
            <table className="w-full border-collapse table-fixed">
              {/* 1. HEADER (Repeats on every page during Print) */}
              <thead className="w-full">
                <tr>
                  <td className="w-full">
                    {/* HEADER GRAPHICS/HTML */}
                    {config.header.show && (
                      <div className="w-full pb-2">
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
                            className="w-full px-8 pt-4 break-words"
                            dangerouslySetInnerHTML={{
                              __html: config.header.html,
                            }}
                          />
                        ) : (
                          <div
                            className="flex justify-between items-center border-b-2 mx-8 mt-6 pb-4"
                            style={{ borderColor: primaryColor }}>
                            <div className="flex gap-4 items-center min-w-0">
                              <div className="h-16 w-16 bg-slate-50 flex items-center justify-center border text-xl font-bold rounded text-slate-400 shrink-0">
                                {patient.lab?.name?.charAt(0) || "L"}
                              </div>
                              <div className="min-w-0 break-words pr-2">
                                <h1
                                  className="text-xl font-bold uppercase tracking-wide leading-tight mb-1"
                                  style={{ color: primaryColor }}>
                                  {config.header.title ||
                                    patient.lab?.name ||
                                    "LABORATORY"}
                                </h1>
                                <p className="text-sm font-medium text-slate-600 leading-tight">
                                  {config.header.subTitle}
                                </p>
                                <div className="text-[10px] text-slate-500 mt-1 leading-tight">
                                  {patient.lab?.address && (
                                    <p>
                                      {patient.lab.address}, {patient.lab?.city}
                                    </p>
                                  )}
                                  <p>Ph: {patient.lab?.phone}</p>
                                </div>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="block text-3xl font-black text-slate-100 uppercase tracking-widest">
                                Report
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* PATIENT DEMOGRAPHICS BLOCK */}
                    <div
                      className={`px-8 w-full ${config.header.mode === "image" ? "pt-2" : "pt-2"}`}>
                      <div className="flex justify-between items-start pb-2 border-b border-slate-200">
                        {/* Flexbox columns instead of percentages to avoid text overlap */}
                        <div className="grid grid-cols-[100px_1fr] gap-x-2 gap-y-1.5 text-xs flex-1 min-w-0 pr-4">
                          <span className="font-bold text-slate-600">
                            Patient Name
                          </span>
                          <span className="font-bold uppercase break-words leading-tight">
                            : {patient.name}
                          </span>

                          <span className="font-bold text-slate-600">
                            Age / Gender
                          </span>
                          <span className="break-words leading-tight">
                            : {patient.age} {patient.ageUnit} / {patient.gender}
                          </span>

                          <span className="font-bold text-slate-600">
                            Patient ID
                          </span>
                          <span className="break-words leading-tight">
                            : {patient.patientId}
                          </span>

                          <span className="font-bold text-slate-600">
                            Ref. By
                          </span>
                          <span className="break-words leading-tight">
                            :{" "}
                            {validTests[0]?.doctor?.user?.name ||
                              validTests[0]?.referringDoctor ||
                              validTests[0]?.referredBy ||
                              "Self"}
                          </span>
                        </div>

                        <div className="grid grid-cols-[90px_1fr] gap-x-2 gap-y-1.5 text-xs flex-1 min-w-0 px-4 border-l border-slate-200">
                          <span className="font-bold text-slate-600">
                            Reported At
                          </span>
                          <span className="break-words leading-tight">
                            : {format(new Date(), "dd/MM/yy h:mm a")}
                          </span>

                          <span className="font-bold text-slate-600">
                            Sample Type
                          </span>
                          <span className="uppercase break-words leading-tight">
                            : {validTests[0]?.sample?.sampleType || "Specimen"}
                          </span>

                          <span className="font-bold text-slate-600">
                            Sample Date
                          </span>
                          <span className="break-words leading-tight">
                            :{" "}
                            {validTests[0]?.sampleCollectedAt
                              ? format(
                                  new Date(validTests[0].sampleCollectedAt),
                                  "dd/MM/yy",
                                )
                              : "-"}
                          </span>
                        </div>

                        <div className="w-[120px] flex justify-end items-start pt-1 shrink-0 overflow-hidden">
                          <Barcode
                            value={barcodeValue}
                            height={35}
                            width={1.2}
                            fontSize={9}
                            displayValue={true}
                            margin={0}
                          />
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              </thead>

              {/* 2. FOOTER (Repeats on every page during Print) */}
              <tfoot className="w-full">
                <tr>
                  <td className="w-full">
                    {config.footer.show && (
                      <div className="w-full relative mt-4">
                        {config.footer.mode === "image" &&
                        config.footer.fullImage ? (
                          <div
                            className="w-full overflow-hidden"
                            style={{
                              height: `${config.footer.height || 100}px`,
                            }}>
                            <img
                              src={config.footer.fullImage}
                              className="w-full h-full object-cover"
                              alt="Footer"
                            />
                          </div>
                        ) : (
                          <div className="px-8 pb-4">
                            <div className="border-t border-slate-300 pt-4">
                              {/* SIGNATURES */}
                              <div className="flex justify-between items-end px-4 mb-4">
                                {Array.isArray(config.footer.signatures) &&
                                  config.footer.signatures.map(
                                    (sig: any, idx: number) => (
                                      <div
                                        key={idx}
                                        className="flex flex-col items-center min-w-[120px] break-inside-avoid">
                                        <div className="h-12 flex items-end justify-center mb-1">
                                          {sig.imageUrl && sig.show ? (
                                            <img
                                              src={sig.imageUrl}
                                              className="h-full object-contain"
                                              alt="Sig"
                                            />
                                          ) : (
                                            <span className="h-8 block"></span>
                                          )}
                                        </div>
                                        <div className="border-t border-slate-400 w-full pt-1 text-center">
                                          <p className="font-bold text-[10px] text-slate-800 uppercase break-words leading-tight">
                                            {sig.title}
                                          </p>
                                        </div>
                                      </div>
                                    ),
                                  )}
                              </div>
                              {/* FOOTER TEXT */}
                              {config.footer.text && (
                                <div
                                  className="text-[9px] text-slate-500 text-center w-full break-words"
                                  dangerouslySetInnerHTML={{
                                    __html: config.footer.text,
                                  }}
                                />
                              )}
                            </div>
                          </div>
                        )}
                        <div className="text-[9px] text-center text-gray-400 pb-2">
                          Powered by Patholab
                        </div>
                      </div>
                    )}
                  </td>
                </tr>
              </tfoot>

              {/* 3. BODY (Flows across pages) */}
              <tbody className="w-full">
                <tr>
                  <td className="w-full p-0">
                    <div className="px-8 py-4 min-h-[140mm]">
                      {validTests.map((test: any, index: number) => {
                        const isLastPage = index === validTests.length - 1;
                        const imageFields: any[] = [];
                        const otherFields: any[] = [];

                        test.testTemplate?.customFields?.forEach((cf: any) => {
                          const def = cf.fieldDef;
                          const resultItem = test.customResults?.find(
                            (r: any) => r.fieldDefId === def.id,
                          );
                          if (resultItem && resultItem.value) {
                            if (def.type === "IMAGE") {
                              imageFields.push({
                                def,
                                value: resultItem.value,
                                fieldDefId: def.id,
                              });
                            } else {
                              otherFields.push({
                                def,
                                value: resultItem.value,
                                type: def.type,
                              });
                            }
                          }
                        });

                        return (
                          <div
                            key={test.id}
                            className="mb-8 break-inside-avoid relative">
                            {/* Test Header */}
                            <div className="mb-4">
                              {test.results &&
                                test.results.length > 0 &&
                                index === 0 && (
                                  <div
                                    className="grid grid-cols-[4fr_2fr_2fr_3fr] gap-2 border-t border-b py-2 px-3 font-bold text-[11px] uppercase mb-4 bg-slate-50"
                                    style={{ borderColor: primaryColor }}>
                                    <div>Investigation</div>
                                    <div>Result</div>
                                    <div>Unit</div>
                                    <div>Ref. Range</div>
                                  </div>
                                )}
                              <h3
                                className="font-bold underline decoration-slate-300 underline-offset-4 uppercase text-sm tracking-wider mb-2 px-3 break-words leading-tight"
                                style={{ color: primaryColor }}>
                                {test.testName}
                              </h3>
                              {test.method && (
                                <p className="text-[10px] text-slate-500 italic mb-2 px-3 break-words">
                                  Method: {test.method}
                                </p>
                              )}
                            </div>

                            {/* Results Table */}
                            {test.results && test.results.length > 0 && (
                              <div className="space-y-0.5">
                                {test.results.map((res: any) => {
                                  const rangeDisplay = getReferenceRange(
                                    res,
                                    test,
                                    patient,
                                  );
                                  return (
                                    <div
                                      key={res.id}
                                      className="grid grid-cols-[4fr_2fr_2fr_3fr] gap-2 text-xs py-2 px-3 border-b border-slate-50 last:border-0 items-start break-inside-avoid">
                                      <div className="font-medium text-slate-800 break-words pr-2">
                                        {res.parameterName}
                                      </div>
                                      <div
                                        className={`font-bold break-words pr-2 ${res.isAbnormal ? "text-red-600" : "text-slate-900"}`}>
                                        {res.value}
                                      </div>
                                      <div className="text-slate-500 break-words pr-2">
                                        {res.unit}
                                      </div>
                                      <div className="text-slate-500 break-words leading-snug">
                                        {rangeDisplay}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {/* Custom Fields (e.g. Clinical Notes) */}
                            {otherFields.length > 0 && (
                              <div className="mt-6 space-y-4 px-3">
                                {otherFields.map(
                                  ({ def, value, type }: any) => (
                                    <div
                                      key={def.id}
                                      className="break-inside-avoid">
                                      {type === "RICH_TEXT" ||
                                      type === "LONG_TEXT" ? (
                                        <>
                                          <h4 className="font-bold text-xs uppercase mb-1.5 text-slate-700 underline decoration-slate-300 underline-offset-2 break-words">
                                            {def.name}
                                          </h4>
                                          <div
                                            className="text-xs text-slate-800 leading-relaxed whitespace-pre-wrap break-words"
                                            dangerouslySetInnerHTML={{
                                              __html: value,
                                            }}
                                          />
                                        </>
                                      ) : (
                                        <div className="grid grid-cols-[2fr_3fr] gap-4 text-xs py-1.5 border-b border-slate-50">
                                          <span className="font-medium text-slate-600 break-words">
                                            {def.name}
                                          </span>
                                          <span className="text-slate-900 font-medium break-words">
                                            {value}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  ),
                                )}
                              </div>
                            )}

                            {/* Standard Notes & Impression */}
                            {(test.notes || test.impression) && (
                              <div className="mt-6 space-y-4 px-3 break-inside-avoid">
                                {test.notes && (
                                  <div
                                    className="text-xs text-slate-600 italic border-l-2 pl-3 break-words leading-relaxed"
                                    style={{ borderColor: primaryColor }}>
                                    <span className="font-bold not-italic">
                                      Note:
                                    </span>{" "}
                                    {test.notes}
                                  </div>
                                )}
                                {test.impression && (
                                  <div className="text-xs text-slate-700 whitespace-pre-wrap border p-4 rounded-lg bg-slate-50 break-words leading-relaxed">
                                    <span
                                      className="font-bold block mb-1.5 uppercase"
                                      style={{ color: primaryColor }}>
                                      Impressions:
                                    </span>{" "}
                                    {test.impression}
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Images (Draggable) */}
                            {imageFields.length > 0 && (
                              <div
                                className="relative w-full mt-6 px-3"
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
                                        position={{ x: layout.x, y: layout.y }}
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
                                              width: parseInt(ref.style.width),
                                              height: parseInt(
                                                ref.style.height,
                                              ),
                                              ...pos,
                                            },
                                          }))
                                        }
                                        bounds="parent"
                                        className={`group ${isEditMode ? "border-2 border-dashed border-indigo-400 bg-indigo-50/10 z-50" : "z-0 relative"}`}
                                        style={
                                          !isEditMode
                                            ? {
                                                position: "relative",
                                                transform: "none",
                                                marginBottom: "16px",
                                                display: "inline-block",
                                                marginRight: "20px",
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
                                            <span className="text-[9px] font-bold text-slate-500 mt-1.5 block text-center uppercase truncate">
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

                            {/* END OF REPORT MARKER */}
                            {isLastPage && (
                              <div className="text-center mt-12 mb-6 break-inside-avoid">
                                <span className="text-xs font-bold text-slate-400 border-t border-b border-slate-200 py-1.5 px-6 tracking-widest uppercase">
                                  *** End of Report ***
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
