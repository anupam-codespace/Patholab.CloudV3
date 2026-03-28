"use client";

import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Loader2,
  Printer,
  Download,
  QrCode,
  Move,
  Save,
  PencilRuler,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRef, useState, useEffect } from "react";
import toast from "react-hot-toast";
import Barcode from "react-barcode";
import { Rnd } from "react-rnd";

// --- 1. FETCH DATA ---
const fetchReportData = async (id: string) => {
  const res = await fetch(`/api/lab-owner/workflow/results/${id}`);
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
      title: "LAB REPORT",
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
      primaryColor: "#1e3a8a",
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
  const [printedAt] = useState(new Date());
  const reportRef = useRef<HTMLDivElement>(null);

  const { data: patient, isLoading } = useQuery({
    queryKey: ["report", id],
    queryFn: () => fetchReportData(id),
  });

  useEffect(() => {
    if (patient?.tests) {
      const initialLayouts: any = {};
      patient.tests.forEach((t: any) => {
        t.customResults?.forEach((cr: any, idx: number) => {
          const key = `${t.id}_${cr.fieldDefId}`;
          initialLayouts[key] = cr.layout || {
            x: 40,
            y: 50, // Default relative Y
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

        return fetch(`/api/lab-owner/workflow/results/${id}`, {
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
        filename: `Report_${patient?.name || "Lab"}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        // Pagebreak handling is tricky with tables in html2pdf, usually 'css' mode is safest
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

  const invoiceId = validTests[0]?.invoiceId;
  const activeTemplate = patient.lab?.reportTemplates?.[0];
  const config = getSafeConfig(activeTemplate);
  const primaryColor = config.branding.primaryColor;
  const barcodeValue = patient.patientId || "UNKNOWN";

  return (
    <div className="flex flex-col items-center py-8 bg-slate-100 min-h-screen print:bg-white print:p-0">
      {/* ✅ CSS TO FORCE HEADER/FOOTER REPEAT */}
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
          }

          /* TABLE MAGIC: This forces headers/footers on every page */
          thead {
            display: table-header-group;
          }
          tfoot {
            display: table-footer-group;
          }

          /* Ensure rows don't break awkwardly */
          tr {
            page-break-inside: avoid;
          }

          /* Hide UI elements */
          .no-print {
            display: none !important;
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
                  `/lab-owner/print/barcodes?invoiceId=${invoiceId}`,
                  "_blank",
                )
              }>
              <QrCode className="h-4 w-4 mr-2" /> Barcodes
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

      {/* ✅ TABLE STRUCTURE FOR REPORT */}
      <div
        id="report-container"
        ref={reportRef}
        className="w-[210mm] bg-white shadow-2xl print:shadow-none relative text-slate-900 font-sans text-sm leading-tight">
        <table className="w-full">
          {/* 1. HEADER (Repeats on every page) */}
          <thead className="w-full">
            <tr>
              <td className="w-full">
                {/* HEADER CONTENT */}
                {config.header.show && (
                  <div className="w-full pb-2">
                    {config.header.mode === "image" &&
                    config.header.fullImage ? (
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
                      <div
                        className="w-full px-8 pt-4"
                        dangerouslySetInnerHTML={{ __html: config.header.html }}
                      />
                    ) : (
                      <div
                        className="flex justify-between items-center border-b-2 mx-8 mt-6 pb-4"
                        style={{ borderColor: primaryColor }}>
                        <div className="flex gap-4 items-center">
                          <div className="h-16 w-16 bg-slate-50 flex items-center justify-center border text-xl font-bold rounded text-slate-400">
                            {patient.lab?.name?.charAt(0)}
                          </div>
                          <div>
                            <h1
                              className="text-xl font-bold uppercase tracking-wide"
                              style={{ color: primaryColor }}>
                              {config.header.title || patient.lab?.name}
                            </h1>
                            <p className="text-sm font-medium text-slate-600">
                              {config.header.subTitle}
                            </p>
                            <div className="text-[10px] text-slate-500 mt-1">
                              {patient.lab?.address && (
                                <p>
                                  {patient.lab.address}, {patient.lab?.city}
                                </p>
                              )}
                              <p>Ph: {patient.lab?.phone}</p>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="block text-3xl font-black text-slate-100 uppercase tracking-widest">
                            Report
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* PATIENT INFO (Part of Header to repeat) */}
                <div
                  className={`px-8 w-full ${config.header.mode === "image" ? "pt-2" : "pt-2"}`}>
                  <div className="flex justify-between items-start pb-2 border-b border-slate-200">
                    <div className="grid grid-cols-[90px_1fr] gap-x-2 gap-y-1 text-xs w-5/12">
                      <span className="font-bold text-slate-600">
                        Patient Name
                      </span>
                      <span className="font-bold uppercase">
                        : {patient.name}
                      </span>
                      <span className="font-bold text-slate-600">
                        Age / Gender
                      </span>
                      <span>
                        : {patient.age} {patient.ageUnit} / {patient.gender}
                      </span>
                      <span className="font-bold text-slate-600">
                        Patient ID
                      </span>
                      <span>: {patient.patientId}</span>
                      <span className="font-bold text-slate-600">Ref. By</span>
                      <span className="truncate">
                        :{" "}
                        {validTests[0]?.doctor?.user?.name ||
                          validTests[0]?.referredBy ||
                          "Self"}
                      </span>
                    </div>
                    <div className="grid grid-cols-[90px_1fr] gap-x-2 gap-y-1 text-xs w-4/12 border-l pl-4">
                      <span className="font-bold text-slate-600">
                        Reported At
                      </span>
                      <span>: {format(new Date(), "dd/MM/yy h:mm a")}</span>
                      <span className="font-bold text-slate-600">
                        Sample Type
                      </span>
                      <span className="uppercase">
                        : {validTests[0]?.sample?.sampleType || "Specimen"}
                      </span>
                      <span className="font-bold text-slate-600">
                        Sample Date
                      </span>
                      <span>
                        :{" "}
                        {validTests[0]?.sampleCollectedAt
                          ? format(
                              new Date(validTests[0].sampleCollectedAt),
                              "dd/MM/yy",
                            )
                          : "-"}
                      </span>
                    </div>
                    <div className="w-3/12 flex justify-end items-start pt-1">
                      <Barcode
                        value={barcodeValue}
                        height={40}
                        width={1.5}
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

          {/* 2. FOOTER (Repeats on every page) */}
          <tfoot className="w-full">
            <tr>
              <td className="w-full">
                {config.footer.show && (
                  <div className="w-full relative mt-4">
                    {config.footer.mode === "image" &&
                    config.footer.fullImage ? (
                      <div
                        className="w-full overflow-hidden"
                        style={{ height: `${config.footer.height || 100}px` }}>
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
                                    className="flex flex-col items-center min-w-[120px]">
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
                                      <p className="font-bold text-[10px] text-slate-800 uppercase">
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
                              className="text-[9px] text-slate-500 text-center w-full"
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
                <div className="px-8 py-4">
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
                                className="grid grid-cols-[2fr_1fr_1fr_1fr] border-t border-b py-1.5 font-bold text-xs uppercase mb-4 bg-slate-50"
                                style={{ borderColor: primaryColor }}>
                                <div className="pl-2">Investigation</div>
                                <div>Result</div>
                                <div>Unit</div>
                                <div>Ref. Range</div>
                              </div>
                            )}
                          <h3
                            className="font-bold underline decoration-slate-300 underline-offset-4 uppercase text-sm tracking-wider mb-2 pl-1"
                            style={{ color: primaryColor }}>
                            {test.testName}
                          </h3>
                          {test.method && (
                            <p className="text-[10px] text-slate-500 italic mb-2">
                              Method: {test.method}
                            </p>
                          )}
                        </div>

                        {/* Results Table */}
                        <div className="space-y-1">
                          {test.results?.map((res: any) => {
                            const rangeDisplay = getReferenceRange(
                              res,
                              test,
                              patient,
                            );
                            return (
                              <div
                                key={res.id}
                                className="grid grid-cols-[2fr_1fr_1fr_1fr] text-xs py-1.5 px-2 border-b border-slate-50 last:border-0 items-start break-inside-avoid">
                                <div className="font-medium text-slate-800">
                                  {res.parameterName}
                                </div>
                                <div
                                  className={`font-bold ${res.isAbnormal ? "text-red-600" : "text-slate-900"}`}>
                                  {res.value}
                                </div>
                                <div className="text-slate-500">{res.unit}</div>
                                <div className="text-slate-500 whitespace-pre-wrap leading-tight">
                                  {rangeDisplay}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Custom Fields */}
                        {otherFields.length > 0 && (
                          <div className="mt-6 space-y-4">
                            {otherFields.map(({ def, value, type }: any) => (
                              <div key={def.id} className="break-inside-avoid">
                                {type === "RICH_TEXT" ? (
                                  <>
                                    <h4 className="font-bold text-xs uppercase mb-1 text-slate-700 underline decoration-slate-300 underline-offset-2">
                                      {def.name}
                                    </h4>
                                    <div
                                      className="text-xs text-slate-800 leading-relaxed whitespace-pre-wrap"
                                      dangerouslySetInnerHTML={{
                                        __html: value,
                                      }}
                                    />
                                  </>
                                ) : (
                                  <div className="grid grid-cols-[2fr_3fr] text-xs py-1 border-b border-slate-50">
                                    <span className="font-medium text-slate-600">
                                      {def.name}
                                    </span>
                                    <span className="text-slate-900 font-medium">
                                      {value}
                                    </span>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Notes & Impression */}
                        {(test.notes || test.impression) && (
                          <div className="mt-6 space-y-4 px-2 break-inside-avoid">
                            {test.notes && (
                              <div
                                className="text-xs text-slate-600 italic border-l-2 pl-3"
                                style={{ borderColor: primaryColor }}>
                                <span className="font-bold not-italic">
                                  Note:
                                </span>{" "}
                                {test.notes}
                              </div>
                            )}
                            {test.impression && (
                              <div className="text-xs text-slate-700 whitespace-pre-wrap border p-3 rounded bg-slate-50">
                                <span
                                  className="font-bold block mb-1 uppercase"
                                  style={{ color: primaryColor }}>
                                  Impressions:
                                </span>{" "}
                                {test.impression}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Images (Draggable) */}
                        <div
                          className="relative w-full mt-4"
                          style={{
                            minHeight: imageFields.length > 0 ? "200px" : "0px",
                          }}>
                          {imageFields.map(({ def, value, fieldDefId }) => {
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
                                    [key]: { ...prev[key], x: d.x, y: d.y },
                                  }))
                                }
                                onResizeStop={(e, dir, ref, delta, pos) =>
                                  setLocalLayouts((prev) => ({
                                    ...prev,
                                    [key]: {
                                      width: parseInt(ref.style.width),
                                      height: parseInt(ref.style.height),
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
                          })}
                        </div>

                        {/* END OF REPORT */}
                        {isLastPage && (
                          <div className="text-center mt-8 mb-6 break-inside-avoid">
                            <span className="text-xs font-bold text-slate-400 border-t border-b border-slate-200 py-1 px-4 tracking-widest">
                              *** END OF REPORT ***
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
  );
}
