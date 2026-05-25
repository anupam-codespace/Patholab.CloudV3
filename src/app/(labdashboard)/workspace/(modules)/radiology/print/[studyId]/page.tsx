"use client";

import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Loader2,
  Printer,
  Download,
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
const fetchReportData = async (studyId: string) => {
  const res = await fetch(`/api/workspace/radiology/print-data/${studyId}`);
  if (!res.ok) throw new Error("Failed to load radiology report data");
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
      title: "RADIOLOGY REPORT",
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
      primaryColor: "#4f46e5", // Default to Indigo-600
      ...config.branding,
    },
  };
};

export default function RadiologyClinicalReportPage() {
  const params = useParams();
  const studyId = params.studyId as string;
  const queryClient = useQueryClient();

  const [isDownloading, setIsDownloading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [localLayouts, setLocalLayouts] = useState<Record<string, any>>({});
  const reportRef = useRef<HTMLDivElement>(null);

  // Fetch Radiology Study Data
  const { data: study, isLoading } = useQuery({
    queryKey: ["radiology-report", studyId],
    queryFn: () => fetchReportData(studyId),
  });

  // Initialize Layouts for Key Images
  useEffect(() => {
    if (study?.report?.keyImages && Array.isArray(study.report.keyImages)) {
      const initialLayouts: any = {};
      study.report.keyImages.forEach((img: any, idx: number) => {
        const key = `img_${idx}`;
        initialLayouts[key] = img.layout || {
          x: 40,
          y: 20,
          width: 250,
          height: 250,
        };
      });
      setLocalLayouts(initialLayouts);
    }
  }, [study]);

  // Save Layout Mutation for Key Images
  const saveLayoutMutation = useMutation({
    mutationFn: async () => {
      const updatedImages = study.report.keyImages.map(
        (img: any, idx: number) => ({
          ...img,
          layout: localLayouts[`img_${idx}`],
        }),
      );

      return fetch(`/api/workspace/radiology/reporting/update-images`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studyId: study.id,
          keyImages: updatedImages,
        }),
      });
    },
    onSuccess: () => {
      toast.success("Image layouts saved!");
      setIsEditMode(false);
      queryClient.invalidateQueries({
        queryKey: ["radiology-report", studyId],
      });
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
        filename: `Radiology_${study?.patient?.name || "Report"}_${study?.accessionNumber || "ACC"}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true },
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

  if (!study || !study.report)
    return (
      <div className="h-[calc(100vh-4rem)] flex flex-col items-center justify-center bg-slate-50 font-sans">
        <FileText className="h-12 w-12 text-rose-400 mb-4" />
        <h2 className="text-xl font-bold text-slate-800">
          Report Not Available
        </h2>
        <p className="text-slate-500 mb-6 max-w-md text-center">
          This report may not have been finalized yet, or the data could not be
          found.
        </p>
        <Link href="/workspace/radiology/reporting">
          <Button variant="outline">
            <ChevronLeft className="h-4 w-4 mr-2" /> Back to Queue
          </Button>
        </Link>
      </div>
    );

  const activeTemplate =
    study.lab?.reportTemplates?.find((t: any) => t.isActive) ||
    study.lab?.reportTemplates?.[0];
  const config = getSafeConfig(activeTemplate);
  const primaryColor = config.branding.primaryColor;

  const barcodeValue = study.accessionNumber || "UNKNOWN";
  const keyImages = Array.isArray(study.report.keyImages)
    ? study.report.keyImages
    : [];

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
          /* TABLE MAGIC: This forces headers/footers on every page */
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
        {/* NON-STICKY ACTION BAR */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-5 bg-white/70 backdrop-blur-xl p-5 rounded-2xl border border-slate-200/60 shadow-sm print:hidden">
          <div className="flex flex-col min-w-0">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight leading-tight truncate">
              Document Preview
            </h1>
            <p
              className={`text-xs font-bold mt-1 uppercase tracking-wider ${study.report.status === "FINAL" ? "text-emerald-600" : "text-amber-600"}`}>
              {study.report.status === "FINAL"
                ? "VERIFIED REPORT"
                : "DRAFT MODE"}
            </p>
          </div>

          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            {keyImages.length > 0 && (
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
                {isEditMode ? "Save Image Layout" : "Adjust Images"}
              </Button>
            )}

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
        {/* overflow-x-auto allows the A4 page to be panned on mobile screens without squishing the strict 210mm width */}
        <div className="w-full overflow-x-auto custom-scrollbar rounded-2xl bg-slate-200/50 p-4 sm:p-8 flex justify-center border border-slate-200/60 print:block print:p-0 print:border-none print:bg-white">
          {/* THE A4 DOCUMENT */}
          <div
            id="report-container"
            ref={reportRef}
            className="w-[210mm] shrink-0 bg-white shadow-2xl print:shadow-none relative text-slate-900 font-sans text-sm leading-tight mx-auto origin-top">
            <table className="w-full border-collapse">
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
                            className="w-full px-8 pt-4"
                            dangerouslySetInnerHTML={{
                              __html: config.header.html,
                            }}
                          />
                        ) : (
                          <div
                            className="flex justify-between items-center border-b-2 mx-8 mt-6 pb-4"
                            style={{ borderColor: primaryColor }}>
                            <div className="flex gap-4 items-center">
                              <div className="h-16 w-16 bg-slate-50 flex items-center justify-center border text-xl font-bold rounded text-slate-400">
                                {study.lab?.name?.charAt(0) || "R"}
                              </div>
                              <div>
                                <h1
                                  className="text-xl font-bold uppercase tracking-wide"
                                  style={{ color: primaryColor }}>
                                  {config.header.title ||
                                    study.lab?.name ||
                                    "LABORATORY"}
                                </h1>
                                <p className="text-sm font-medium text-slate-600">
                                  {config.header.subTitle}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="block text-3xl font-black text-slate-100 uppercase tracking-widest">
                                Radiology
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
                        <div className="grid grid-cols-[90px_1fr] gap-x-2 gap-y-1 text-xs w-5/12">
                          <span className="font-bold text-slate-600">
                            Patient Name
                          </span>
                          <span className="font-bold uppercase">
                            : {study?.patient?.name || "N/A"}
                          </span>

                          <span className="font-bold text-slate-600">
                            Age / Gender
                          </span>
                          <span>
                            : {study?.patient?.age || "-"}{" "}
                            {study?.patient?.ageUnit || ""} /{" "}
                            {study?.patient?.gender || "-"}
                          </span>

                          <span className="font-bold text-slate-600">
                            Patient ID
                          </span>
                          <span>
                            :{" "}
                            {study?.patient?.id?.slice(0, 8).toUpperCase() ||
                              "N/A"}
                          </span>

                          <span className="font-bold text-slate-600">
                            Ref. By
                          </span>
                          <span className="truncate">
                            : {study?.referringDoctor || "Self"}
                          </span>
                        </div>

                        <div className="grid grid-cols-[90px_1fr] gap-x-2 gap-y-1 text-xs w-4/12 border-l pl-4">
                          <span className="font-bold text-slate-600">
                            Modality
                          </span>
                          <span
                            className="font-bold uppercase"
                            style={{ color: primaryColor }}>
                            : {study?.modality?.type || "UNKNOWN"}
                          </span>

                          <span className="font-bold text-slate-600">
                            Scan Date
                          </span>
                          <span>
                            :{" "}
                            {study?.performedAt
                              ? format(
                                  new Date(study.performedAt),
                                  "dd/MM/yy h:mm a",
                                )
                              : "-"}
                          </span>

                          <span className="font-bold text-slate-600">
                            Report Date
                          </span>
                          <span>
                            :{" "}
                            {study?.report?.verifiedAt
                              ? format(
                                  new Date(study.report.verifiedAt),
                                  "dd/MM/yy h:mm a",
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
                      </div>
                    )}
                  </td>
                </tr>
              </tfoot>

              {/* 3. BODY (Clinical Text & Images Flowing across pages) */}
              <tbody className="w-full">
                <tr>
                  <td className="w-full p-0">
                    <div className="px-10 py-8 min-h-[140mm]">
                      {/* Scan Title */}
                      <h2
                        className="text-center text-lg font-bold uppercase underline underline-offset-4 mb-8"
                        style={{ color: primaryColor }}>
                        {study?.modality?.type} SCAN: {study?.scanName}
                      </h2>

                      {/* Clinical Indication */}
                      <div className="mb-6 break-inside-avoid">
                        <h3 className="text-sm font-bold uppercase mb-2">
                          Clinical Indication:
                        </h3>
                        <p className="text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">
                          {study?.clinicalHistory ||
                            study?.report?.clinicalNotes ||
                            "As referred by physician."}
                        </p>
                      </div>

                      {/* Findings */}
                      <div className="mb-8">
                        <h3 className="text-sm font-bold uppercase mb-2">
                          Findings:
                        </h3>
                        <div className="text-sm leading-relaxed whitespace-pre-wrap text-justify">
                          {study?.report?.findings || "No findings recorded."}
                        </div>
                      </div>

                      {/* Impression */}
                      <div
                        className="mb-8 p-4 bg-slate-50/80 border-l-4 rounded-r-lg break-inside-avoid"
                        style={{ borderColor: primaryColor }}>
                        <h3 className="text-base font-black uppercase mb-2">
                          Impression:
                        </h3>
                        <div className="text-sm font-bold leading-relaxed whitespace-pre-wrap">
                          {study?.report?.impression ||
                            "No impression recorded."}
                        </div>
                      </div>

                      {/* Key Images (Drag & Drop DICOM Snapshots) */}
                      {keyImages.length > 0 && (
                        <div
                          className="relative w-full mt-8 break-inside-avoid"
                          style={{ minHeight: "200px" }}>
                          <h3 className="text-sm font-bold uppercase mb-4 text-slate-400 border-b pb-2">
                            Key Images
                          </h3>
                          {keyImages.map((img: any, idx: number) => {
                            const key = `img_${idx}`;
                            const layout = localLayouts[key] || {
                              x: 0,
                              y: 0,
                              width: 200,
                              height: 200,
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
                                className={`group ${isEditMode ? "border-2 border-dashed border-indigo-400 bg-indigo-50/10 z-50" : "z-0 relative"}`}
                                style={
                                  !isEditMode
                                    ? {
                                        position: "relative",
                                        transform: "none",
                                        marginBottom: "20px",
                                        display: "inline-block",
                                        marginRight: "20px",
                                      }
                                    : {}
                                }>
                                <div className="w-full h-full relative border border-slate-200 p-1 bg-white shadow-sm">
                                  <img
                                    src={img.url}
                                    alt="Key Snapshot"
                                    className="w-full h-full object-contain"
                                  />
                                  {!isEditMode && img.caption && (
                                    <span className="text-[10px] font-medium text-slate-600 mt-2 block text-center truncate">
                                      {img.caption}
                                    </span>
                                  )}
                                </div>
                              </Rnd>
                            );
                          })}
                        </div>
                      )}

                      {/* END OF REPORT */}
                      <div className="text-center mt-12 mb-6 break-inside-avoid">
                        <span className="text-xs font-bold text-slate-400 border-t border-b border-slate-200 py-1 px-4 tracking-widest">
                          *** END OF REPORT ***
                        </span>
                      </div>
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
