"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Loader2,
  Download,
  History,
  Calendar,
  FileCheck2,
  MessageCircle,
  Mail,
  ArrowUp,
  ArrowDown,
  Check,
  Activity,
  Printer,
  Settings2,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useMemo, useRef } from "react";
import toast from "react-hot-toast";
import Barcode from "react-barcode";
import QRCode from "qrcode";
import { useReactToPrint } from "react-to-print";

// ─── Import the print component (Ensure this matches your path) ───
import PrintReport from "./PrintReport";

// ─── 1. FETCH DATA ──────────────────────────────────────
const fetchReportData = async (id: string) => {
  const res = await fetch(`/api/workspace/workflow/results/${id}`);
  if (!res.ok) throw new Error("Failed to load report data");
  return res.json();
};

// ─── 2. CONFIG HELPER (Supports New Absolute Schema) ───
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

  // If it's the new DND Format, return it
  if (config.pages && Array.isArray(config.pages)) {
    return { ...config, isLegacy: false };
  }

  // If it has old format keys (header, bodyOptions), flag it
  if (config.header || config.bodyOptions) {
    return { isLegacy: true, ...config };
  }

  // Empty Fallback
  return {
    isLegacy: false,
    pages: [
      {
        id: "default-page",
        width: 794,
        height: 1123,
        background: "#ffffff",
        margin: { top: 20, right: 20, bottom: 20, left: 20 },
        border: { show: false, width: 1, color: "#000000", style: "solid" },
        watermark: {
          url: "",
          opacity: 10,
          size: "contain",
          position: "center",
        },
        pageNumber: {
          show: false,
          position: "bottom-right",
          format: "page-x-of-y",
        },
        elements: [],
      },
    ],
  };
};

// ─── 3. LAB REFERENCE HELPERS ────────────────────────────
const getReferenceRange = (res: any) => {
  if (res.referenceRangeText) return res.referenceRangeText;
  if (res.refRangeText) return res.refRangeText;
  if (res.refRangeMin != null && res.refRangeMax != null)
    return `${res.refRangeMin} - ${res.refRangeMax}`;
  return "-";
};

const getMinMax = (res: any) => {
  const rangeStr = getReferenceRange(res);
  if (!rangeStr) return { min: null, max: null };
  const parts = rangeStr.split("-").map((s: string) => parseFloat(s.trim()));
  if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1]))
    return { min: parts[0], max: parts[1] };
  if (res.refRangeMin != null && res.refRangeMax != null)
    return { min: res.refRangeMin, max: res.refRangeMax };
  return { min: null, max: null };
};

// ─── 4. VARIABLE REPLACER ────────────────────────────────
const replaceVariables = (text: string, data: any) => {
  if (!text) return "";
  return text
    .replace(/\{\{patient\.name\}\}/g, data.patient?.name || "")
    .replace(/\{\{patient\.age\}\}/g, data.patient?.age || "")
    .replace(/\{\{patient\.gender\}\}/g, data.patient?.gender || "")
    .replace(/\{\{patient\.id\}\}/g, data.patient?.patientId || "")
    .replace(/\{\{patient\.uhid\}\}/g, data.patient?.patientId || "")
    .replace(/\{\{sample\.id\}\}/g, data.barcodeValue || "")
    .replace(/\{\{sample\.referredBy\}\}/g, data.refDoctorName || "")
    .replace(/\{\{system\.date\}\}/g, data.timestamps?.reported || "");
};

export default function ClinicalReportPage() {
  const params = useParams();
  const id = params.id as string;

  const [isDownloading, setIsDownloading] = useState<string | null>(null);
  const [verificationUrl, setVerificationUrl] = useState("");
  const [showFlags, setShowFlags] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    null,
  );

  // RESTORED PRINT OPTIONS
  const [printOptions, setPrintOptions] = useState({
    includeHeader: true,
    includeExtraPages: true,
  });

  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const printRef = useRef<any>(null);

  const { data: patient, isLoading } = useQuery({
    queryKey: ["report", id],
    queryFn: () => fetchReportData(id),
  });

  useEffect(() => {
    const url = `${window.location.origin}/verify/${id}`;
    setVerificationUrl(url);
    QRCode.toDataURL(url, {
      margin: 0,
      color: { dark: "#0f172a", light: "#ffffff" },
    }).then(setQrDataUrl);
  }, [id]);

  const groupedVisits = useMemo(() => {
    if (!patient || !patient.tests) return [];
    const validTests = patient.tests.filter(
      (t: any) => t.status !== "PENDING" && t.status !== "CANCELLED",
    );
    const visitsMap: Record<string, any> = {};
    validTests.forEach((test: any) => {
      const invId = test.invoiceId || "UNBILLED";
      const invNo = test.invoice?.invoiceNumber || "Unbilled Visit";
      const date = test.approvedAt || test.createdAt;
      if (!visitsMap[invId]) {
        visitsMap[invId] = {
          invoiceId: invId,
          invoiceNumber: invNo,
          date: date,
          formattedDate: format(new Date(date), "dd MMM yyyy, hh:mm a"),
          tests: [],
        };
      }
      visitsMap[invId].tests.push(test);
    });
    return Object.values(visitsMap).sort(
      (a: any, b: any) =>
        new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  }, [patient]);

  const templates = patient?.lab?.reportTemplates || [];
  const activeTemplate = templates.find((t: any) => t.isActive === true);
  const defaultTemplateId = activeTemplate?.id || templates[0]?.id || null;

  useEffect(() => {
    if (defaultTemplateId && !selectedTemplateId) {
      setSelectedTemplateId(defaultTemplateId);
    }
  }, [defaultTemplateId, selectedTemplateId]);

  const selectedTemplate = templates.find(
    (t: any) => t.id === selectedTemplateId,
  );
  const config = getSafeConfig(selectedTemplate);

  // ─── Actions ───
  const handleWhatsAppShare = (visit: any) => {
    if (!patient) return toast.error("Patient data not loaded");
    let phone = patient.phone;
    if (!phone) return toast.error("No phone number saved for this patient.");
    phone = phone.replace(/\D/g, "");
    if (phone.length === 10) phone = `91${phone}`;
    const message = `Hello ${patient.name},\n\nYour lab test report (Visit: ${visit.invoiceNumber}) is ready.\n\nView and securely download it here:\n${verificationUrl}`;
    window.open(
      `https://wa.me/${phone}?text=${encodeURIComponent(message)}`,
      "_blank",
    );
  };

  const handleEmailShare = (visit: any) => {
    if (!patient) return toast.error("Patient data not loaded");
    const email = patient.email;
    if (!email) return toast.error("No email saved.");
    const subject = `Your Lab Report - ${visit.invoiceNumber}`;
    const body = `Hello ${patient.name},\n\nYour report is ready: \n${verificationUrl}`;
    window.open(
      `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
      "_blank",
    );
  };

  // RESTORED DOWNLOAD LOGIC
  const handleDownload = async (visit: any) => {
    setIsDownloading(visit.invoiceId);
    const toastId = toast.loading(
      `Building PDF for Invoice ${visit.invoiceNumber}...`,
    );
    try {
      const payload = {
        patient,
        lab: patient.lab,
        validTests: visit.tests,
        templateId: selectedTemplateId,
        config,
        qrCodeDataUrl: qrDataUrl,
        barcodeValue: visit.tests[0]?.sample?.sampleId || patient.patientId,
        timestamps: { reported: new Date().toISOString() },
        printOptions,
      };

      const res = await fetch("/api/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to generate PDF");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Report_${patient.name.replace(/[^a-zA-Z0-9]/g, "_")}_${visit.invoiceNumber}.pdf`;
      a.click();
      toast.success("PDF Download Complete!", { id: toastId });
    } catch (e) {
      // Fallback to local print if API fails
      toast.error("API PDF Failed. Using local print.", { id: toastId });
      handlePrint();
    }
    setIsDownloading(null);
  };

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: `${patient?.name || "Report"}_Print`,
  });

  if (isLoading)
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="animate-spin h-8 w-8 text-blue-600" />
      </div>
    );
  if (!patient || groupedVisits.length === 0)
    return (
      <div className="p-10 text-center text-slate-500">
        No completed tests available.
      </div>
    );

  const latestVisit = groupedVisits[0];
  const pastVisits = groupedVisits.slice(1);
  const primaryTest = latestVisit.tests[0];

  const templateData = {
    patient,
    barcodeValue:
      primaryTest?.sample?.sampleId || patient.patientId || "UNKNOWN",
    refDoctorName:
      primaryTest?.doctor?.user?.name || primaryTest?.referredBy || "Self",
    timestamps: {
      collected: primaryTest?.sampleCollectedAt
        ? format(new Date(primaryTest.sampleCollectedAt), "dd/MM/yy HH:mm")
        : "-",
      received: primaryTest?.sampleReceivedAt
        ? format(new Date(primaryTest.sampleReceivedAt), "dd/MM/yy HH:mm")
        : "-",
      reported: primaryTest?.approvedAt
        ? format(new Date(primaryTest.approvedAt), "dd/MM/yy HH:mm")
        : format(new Date(), "dd/MM/yy HH:mm"),
    },
  };

  // ─── DYNAMIC ELEMENT RENDERER ─────────────────────────
  const RenderElement = ({ el }: { el: any }) => {
    const { type, props } = el;

    if (type === "text") {
      // Check if it's a hidden header component governed by printOptions
      if (
        props.content?.toLowerCase().includes("globiz") &&
        !printOptions.includeHeader
      )
        return null;

      return (
        <div
          style={{
            ...props,
            width: "100%",
            height: "100%",
            wordBreak: "break-word",
          }}
          dangerouslySetInnerHTML={{
            __html: replaceVariables(props.content, templateData),
          }}
        />
      );
    }

    if (type === "image") {
      return (
        <img
          src={props.src || props.imageUrl}
          style={{
            width: "100%",
            height: "100%",
            objectFit: props.objectFit || "contain",
            opacity: props.opacity || 1,
          }}
          alt="img"
        />
      );
    }

    if (type === "qr") {
      return (
        <img
          src={qrDataUrl}
          style={{ width: "100%", height: "100%", objectFit: "contain" }}
          alt="QR"
        />
      );
    }

    if (type === "barcode") {
      return (
        <div className="w-full h-full flex justify-center items-center">
          <Barcode
            value={templateData.barcodeValue}
            height={el.height * 0.5}
            width={1.5}
            fontSize={10}
            displayValue={props.displayValue !== false}
            margin={0}
          />
        </div>
      );
    }

    if (type === "shape") {
      return (
        <div
          style={{
            width: "100%",
            height: "100%",
            backgroundColor: props.fillColor,
            border: `${props.strokeWidth || 0}px solid ${props.strokeColor}`,
            borderRadius: props.shapeType === "circle" ? "50%" : "0",
          }}
        />
      );
    }

    if (type === "patientData") {
      return (
        <div
          style={{
            borderColor: props.borderColor,
            backgroundColor: props.bgColor,
            padding: `${props.padding}px`,
            fontSize: `${props.fontSize}px`,
            width: "100%",
            height: "100%",
            borderRadius: "8px",
            border: "1px solid",
          }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${props.gridColumns || 2}, minmax(0, 1fr))`,
              gap: "8px",
            }}>
            {props.showName !== false && (
              <div className="flex">
                <strong style={{ color: props.labelColor, width: "100px" }}>
                  Patient Name
                </strong>
                <span style={{ color: props.valueColor }}>
                  : {templateData.patient.name}
                </span>
              </div>
            )}
            {props.showAge !== false && (
              <div className="flex">
                <strong style={{ color: props.labelColor, width: "100px" }}>
                  Age / Gender
                </strong>
                <span style={{ color: props.valueColor }}>
                  : {templateData.patient.age} / {templateData.patient.gender}
                </span>
              </div>
            )}
            {props.showPatientId !== false && (
              <div className="flex">
                <strong style={{ color: props.labelColor, width: "100px" }}>
                  Patient ID
                </strong>
                <span style={{ color: props.valueColor }}>
                  : {templateData.patient.patientId}
                </span>
              </div>
            )}
            {props.showSampleId !== false && (
              <div className="flex">
                <strong style={{ color: props.labelColor, width: "100px" }}>
                  Sample ID
                </strong>
                <span style={{ color: props.valueColor }}>
                  : {templateData.barcodeValue}
                </span>
              </div>
            )}
            {props.showReferredBy !== false && (
              <div className="flex">
                <strong style={{ color: props.labelColor, width: "100px" }}>
                  Referred By
                </strong>
                <span style={{ color: props.valueColor }}>
                  : {templateData.refDoctorName}
                </span>
              </div>
            )}
            {props.showRegistrationDate !== false && (
              <div className="flex">
                <strong style={{ color: props.labelColor, width: "100px" }}>
                  Registered
                </strong>
                <span style={{ color: props.valueColor }}>
                  : {templateData.timestamps.reported}
                </span>
              </div>
            )}
          </div>
        </div>
      );
    }

    if (type === "table") {
      return (
        <div className="w-full h-full">
          {latestVisit.tests.map((test: any) => {
            if (!test.results || test.results.length === 0) return null;
            return (
              <div key={test.id} className="mb-4">
                <div
                  style={{
                    backgroundColor: props.headerBgColor || "#f1f5f9",
                    color: props.headerTextColor || "#0f172a",
                    textAlign: "center",
                    fontWeight: "bold",
                    padding: "4px",
                  }}
                  className="text-xs uppercase border-y mb-2 tracking-wider">
                  {test.testTemplate?.department?.name || "LABORATORY TEST"}
                </div>
                <h3
                  className="text-center font-bold text-sm mb-2 underline uppercase"
                  style={{ color: props.headerTextColor || "#1e3a8a" }}>
                  {test.testName}
                </h3>

                <table
                  className="w-full border-collapse"
                  style={{ fontSize: "11px", borderColor: props.borderColor }}>
                  <thead
                    className="border-b-2 text-left"
                    style={{ borderColor: props.borderColor || "#cbd5e1" }}>
                    <tr>
                      <th className="py-1.5 px-1 font-bold">Parameter</th>
                      <th className="py-1.5 px-1 font-bold">Result</th>
                      <th className="py-1.5 px-1 font-bold">Unit</th>
                      <th className="py-1.5 px-1 font-bold">Reference Range</th>
                    </tr>
                  </thead>
                  <tbody>
                    {test.results.map((res: any, idx: number) => {
                      const val =
                        res.value || res.textValue || res.numericValue || "";
                      const unt = res.unit || res.parameter?.unit || "";
                      const pName = res.printName || res.parameterName;
                      const { min, max } = getMinMax(res);
                      const valNum = parseFloat(val);
                      let flag = "NORMAL";
                      let valColor = "text-slate-900";
                      let icon = null;

                      if (!isNaN(valNum) && min !== null && max !== null) {
                        if (valNum < min) {
                          flag = "LOW";
                          valColor = "text-blue-600";
                          icon = <ArrowDown className="w-3 h-3 inline ml-1" />;
                        } else if (valNum > max) {
                          flag = "HIGH";
                          valColor = "text-red-600";
                          icon = <ArrowUp className="w-3 h-3 inline ml-1" />;
                        }
                      }

                      return (
                        <tr
                          key={idx}
                          style={{
                            backgroundColor:
                              idx % 2 === 0
                                ? props.rowBgColor
                                : props.rowAlternateColor,
                            borderBottom: `1px solid ${props.borderColor || "#eee"}`,
                          }}>
                          <td className="py-1.5 px-1 font-medium">{pName}</td>
                          <td
                            className={`py-1.5 px-1 font-bold ${showFlags ? valColor : "text-slate-900"}`}>
                            {val} {showFlags && icon}
                          </td>
                          <td className="py-1.5 px-1 text-slate-500">{unt}</td>
                          <td className="py-1.5 px-1 text-slate-500 whitespace-pre-wrap">
                            {getReferenceRange(res)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      );
    }

    if (type === "signature") {
      return (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "flex-end",
          }}>
          {props.imageUrl ? (
            <img
              src={props.imageUrl}
              className="h-10 object-contain mb-1"
              alt="Sig"
            />
          ) : (
            <div className="h-10 mb-1" />
          )}
          <div
            style={{
              borderTop: `1px solid ${props.lineColor || "#000"}`,
              width: "100%",
              textAlign: "center",
              paddingTop: "4px",
            }}>
            <p className="font-bold text-[10px] m-0 leading-tight">
              {props.name || "Signatory"}
            </p>
            <p className="text-[8px] text-slate-500 m-0">{props.designation}</p>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="flex flex-col items-center py-10 bg-slate-900 min-h-screen print:bg-white print:py-0 print:block">
      {/* ─── Top Action Bar ────────────────────────────── */}
      <div className="w-[210mm] max-w-[100%] print:hidden flex flex-col md:flex-row justify-between items-center mb-6 sticky top-4 z-50 bg-white/95 backdrop-blur-md p-4 rounded-xl shadow-xl border border-blue-200 gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-blue-600 p-3 rounded-lg text-white shadow-inner hidden md:block">
            <FileCheck2 size={28} />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-800 flex items-center gap-2">
              Report{" "}
              <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full uppercase tracking-wider">
                {latestVisit.invoiceNumber}
              </span>
            </h1>
            <p className="text-sm font-medium text-slate-500 mt-1 flex items-center gap-1.5">
              <Calendar className="w-4 h-4" /> {latestVisit.formattedDate}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Template Selector */}
          <select
            className="h-10 rounded-lg border-2 border-slate-200 bg-white px-3 py-1 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={selectedTemplateId || ""}
            onChange={(e) => setSelectedTemplateId(e.target.value || null)}>
            {templates.length === 0 ? (
              <option value="">Default Layout</option>
            ) : (
              templates.map((t: any) => (
                <option key={t.id} value={t.id}>
                  {t.name} {t.isActive ? "(Active)" : ""}
                </option>
              ))
            )}
          </select>

          {/* RESTORED PRINT OPTIONS SETTINGS */}
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-1 rounded-lg border border-slate-200 h-10">
            <Settings2 className="w-4 h-4 text-slate-500" />
            <label className="flex items-center gap-1 text-sm whitespace-nowrap cursor-pointer">
              <input
                type="checkbox"
                checked={printOptions.includeHeader}
                onChange={(e) =>
                  setPrintOptions({
                    ...printOptions,
                    includeHeader: e.target.checked,
                  })
                }
              />
              Header
            </label>
            <label className="flex items-center gap-1 text-sm whitespace-nowrap cursor-pointer">
              <input
                type="checkbox"
                checked={printOptions.includeExtraPages}
                onChange={(e) =>
                  setPrintOptions({
                    ...printOptions,
                    includeExtraPages: e.target.checked,
                  })
                }
              />
              Extra Pages
            </label>
          </div>

          <Button
            variant="outline"
            onClick={() => setShowFlags(!showFlags)}
            className={`h-10 rounded-lg font-bold border-2 transition-all ${showFlags ? "bg-indigo-50 text-indigo-700 border-indigo-200" : "text-slate-600 border-slate-200"}`}>
            <Activity className="w-4 h-4 md:mr-2" />
            <span className="hidden md:inline">
              {showFlags ? "Flags: ON" : "Flags: OFF"}
            </span>
          </Button>

          <Button
            variant="outline"
            onClick={() => handleWhatsAppShare(latestVisit)}
            className="text-emerald-600 border-emerald-200 hover:bg-emerald-50 h-10 rounded-lg"
            title="WhatsApp">
            <MessageCircle className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            onClick={() => handleEmailShare(latestVisit)}
            className="text-blue-600 border-blue-200 hover:bg-blue-50 h-10 rounded-lg"
            title="Email">
            <Mail className="w-4 h-4" />
          </Button>

          <Button
            className="bg-purple-600 hover:bg-purple-700 text-white shadow-md transition-all h-10 rounded-lg font-bold"
            onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" /> Print
          </Button>

          <Button
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-md transition-all h-10 rounded-lg font-bold"
            onClick={() => handleDownload(latestVisit)}
            disabled={isDownloading === latestVisit.invoiceId}>
            {isDownloading === latestVisit.invoiceId ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            PDF
          </Button>
        </div>
      </div>

      {/* ─── Historical Visits ──────────────────────────── */}
      {pastVisits.length > 0 && (
        <div className="w-[210mm] max-w-[100%] print:hidden bg-slate-800 border border-slate-700 p-4 rounded-xl mb-6 shadow-md">
          <h3 className="text-slate-300 font-bold uppercase tracking-wider text-xs mb-3 flex items-center gap-2">
            <History className="w-4 h-4" /> Previous Lab Visits
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {pastVisits.map((visit: any) => (
              <div
                key={visit.invoiceId}
                className="bg-slate-700/50 hover:bg-slate-700 border border-slate-600 rounded-lg p-3 flex justify-between items-center">
                <div>
                  <p className="text-slate-200 text-sm font-bold">
                    {visit.invoiceNumber}
                  </p>
                  <p className="text-slate-400 text-xs mt-0.5">
                    {visit.formattedDate}
                  </p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  className="bg-slate-600 hover:bg-blue-600 text-white h-8"
                  onClick={() => handleDownload(visit)}
                  disabled={isDownloading === visit.invoiceId}>
                  {isDownloading === visit.invoiceId ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── NEW ABSOLUTE PREVIEW ENGINE ────────────────── */}
      <div ref={printRef} className="w-full flex flex-col items-center">
        {config.isLegacy && (
          <div className="w-[210mm] bg-yellow-100 border-l-4 border-yellow-500 p-4 mb-4 text-yellow-700 print:hidden">
            <p className="font-bold flex items-center">
              <AlertTriangle className="mr-2 h-5 w-5" /> Legacy Template
              Detected
            </p>
            <p className="text-sm mt-1">
              This template was created with the old flow-based builder. Please
              recreate it using the new Canvas Builder for it to render
              correctly here.
            </p>
          </div>
        )}

        {config.pages?.map((page: any, index: number) => {
          const isExtraPage = index > 0;
          if (isExtraPage && !printOptions.includeExtraPages) return null;

          return (
            <div
              key={page.id || index}
              className="relative shadow-[0_20px_50px_rgba(0,0,0,0.3)] mb-8 print:shadow-none print:mb-0 print:break-after-page"
              style={{
                width: `${page.width || 794}px`,
                height: `${page.height || 1123}px`,
                backgroundColor: page.background || "#ffffff",
                overflow: "hidden",
                pageBreakAfter: "always",
              }}>
              {/* PAGE BORDER */}
              {page.border?.show && (
                <div
                  className="absolute pointer-events-none"
                  style={{
                    top: 0,
                    bottom: 0,
                    left: 0,
                    right: 0,
                    border: `${page.border.width || 1}px ${page.border.style || "solid"} ${page.border.color || "#000000"}`,
                    zIndex: 1000,
                  }}
                />
              )}

              {/* PAGE WATERMARK */}
              {page.watermark?.url && (
                <div
                  className="absolute pointer-events-none flex inset-0 z-0 items-center justify-center"
                  style={{ opacity: (page.watermark.opacity || 10) / 100 }}>
                  <img
                    src={page.watermark.url}
                    alt="Watermark"
                    style={{
                      width: page.watermark.size === "cover" ? "100%" : "auto",
                      height: page.watermark.size === "cover" ? "100%" : "auto",
                      maxWidth:
                        page.watermark.size === "contain" ? "80%" : "none",
                      objectFit: (page.watermark.size as any) || "contain",
                    }}
                  />
                </div>
              )}

              {/* EMPTY STATE WARNING */}
              {(!page.elements || page.elements.length === 0) &&
                !config.isLegacy && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20 print:hidden">
                    <h1 className="text-4xl font-bold uppercase tracking-widest text-slate-500 transform -rotate-45">
                      Blank Canvas
                    </h1>
                  </div>
                )}

              {/* RENDER ABSOLUTE ELEMENTS */}
              {page.elements?.map((el: any) => (
                <div
                  key={el.id}
                  className="absolute"
                  style={{
                    left: `${el.x}px`,
                    top: `${el.y}px`,
                    width: `${el.width}px`,
                    height: `${el.height}px`,
                    transform: `rotate(${el.rotation || 0}deg)`,
                    zIndex: el.zIndex || 1,
                  }}>
                  <RenderElement el={el} />
                </div>
              ))}

              {/* PAGE NUMBERS */}
              {page.pageNumber?.show && (
                <div
                  className="absolute text-slate-500 text-[10px] z-50 font-medium"
                  style={{ bottom: "20px", right: "20px" }}>
                  {page.pageNumber.format === "page-x-of-y"
                    ? `Page ${index + 1} of ${config.pages.length}`
                    : `Page ${index + 1}`}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
