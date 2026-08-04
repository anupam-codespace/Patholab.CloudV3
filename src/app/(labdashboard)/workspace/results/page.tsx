"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Search,
  ClipboardSignature,
  Loader2,
  CheckCircle2,
  ChevronRight,
  Save,
  AlertCircle,
  FileText,
  User,
  Phone,
  Stethoscope,
  Microscope,
  ArrowUp,
  ArrowDown,
  Activity,
  ArrowLeft,
  Printer,
  MonitorCheck,
  Check,
} from "lucide-react";
import toast from "react-hot-toast";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

// --- TYPES ---
interface TestResultParam {
  id: string;
  parameterName: string;
  unit: string | null;
  refRangeMin: number | null;
  refRangeMax: number | null;
  refRangeText: string | null;
  value: string | null;
}

interface LabTestRecord {
  id: string;
  testName: string;
  status: string;
  notes: string | null;
  impression: string | null;
  results: TestResultParam[];
}

interface InvoiceWorklist {
  invoiceId: string;
  invoiceNumber: string;
  createdAt: string;
  patient: {
    id: string;
    name: string;
    age: number;
    gender: string;
    phone: string;
  };
  referredBy: string | null;
  tests: LabTestRecord[];
}

type TabStatus = "PENDING" | "DRAFT" | "NEEDS_APPROVAL" | "COMPLETED";

export default function ResultEntryPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabStatus>("PENDING");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedInvoice, setSelectedInvoice] =
    useState<InvoiceWorklist | null>(null);
  const [isSyncingIoT, setIsSyncingIoT] = useState(false);

  // Form State dictionaries
  const [paramValues, setParamValues] = useState<Record<string, string>>({});
  const [testNotes, setTestNotes] = useState<Record<string, string>>({});
  const [testImpressions, setTestImpressions] = useState<
    Record<string, string>
  >({});

  // 1. FETCH WORKLIST
  const { data: worklist = [], isLoading } = useQuery<InvoiceWorklist[]>({
    queryKey: ["worklist", activeTab],
    queryFn: async () => {
      const res = await fetch(`/api/workspace/results?status=${activeTab}`);
      if (!res.ok) throw new Error("Failed to fetch worklist");
      return (await res.json()).worklist;
    },
  });

  // 2. LOAD STATE WHEN INVOICE SELECTED
  const handleSelectInvoice = (invoice: InvoiceWorklist) => {
    setSelectedInvoice(invoice);

    const initialParams: Record<string, string> = {};
    const initialNotes: Record<string, string> = {};
    const initialImpressions: Record<string, string> = {};

    invoice.tests.forEach((test) => {
      initialNotes[test.id] = test.notes || "";
      initialImpressions[test.id] = test.impression || "";
      test.results.forEach((param) => {
        initialParams[param.id] = param.value || "";
      });
    });

    setParamValues(initialParams);
    setTestNotes(initialNotes);
    setTestImpressions(initialImpressions);
  };

  // 3. MUTATIONS
  const saveResultsMutation = useMutation({
    mutationFn: async (payload: {
      invoiceId: string;
      action: "SAVE_DRAFT" | "REQUEST_APPROVAL" | "APPROVE";
      data: any;
    }) => {
      const res = await fetch(
        `/api/workspace/results/${payload.invoiceId}/save`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      if (!res.ok) throw new Error("Failed to save");
      return res.json();
    },
    onSuccess: (_, variables) => {
      if (variables.action === "SAVE_DRAFT") {
        toast.success("Draft saved successfully.");
      } else if (variables.action === "REQUEST_APPROVAL") {
        toast.success("Sent to Doctor for approval!");
        setSelectedInvoice(null);
      } else {
        toast.success("Results Approved & Report Generated!");
        setSelectedInvoice(null);
      }
      queryClient.invalidateQueries({ queryKey: ["worklist"] });
    },
    onError: () => toast.error("An error occurred while saving."),
  });

  const handleAction = (
    action: "SAVE_DRAFT" | "REQUEST_APPROVAL" | "APPROVE",
  ) => {
    if (!selectedInvoice) return;
    saveResultsMutation.mutate({
      invoiceId: selectedInvoice.invoiceId,
      action,
      data: {
        parameters: paramValues,
        notes: testNotes,
        impressions: testImpressions,
      },
    });
  };

  const handleDownloadReport = async () => {
    if (!selectedInvoice) return;

    try {
      const response = await fetch("/api/reports/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "generate_invoice_report",
          invoiceId: selectedInvoice.invoiceId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);

        throw new Error(errorData?.error || "Failed to generate report");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = `Clinical_Report_${selectedInvoice.invoiceNumber}.pdf`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(url);

      toast.success("Final report downloaded successfully!");
    } catch (error) {
      console.error("Report download error:", error);

      toast.error(
        error instanceof Error ? error.message : "Failed to download report",
      );
    }
  };

  // --- SMART CLINICAL EVALUATION ---
  const evaluateResult = (
    val: string,
    min: number | null,
    max: number | null,
  ) => {
    if (!val || min === null || max === null)
      return {
        status: "NORMAL",
        color: "text-slate-900",
        bg: "bg-white",
        border: "border-slate-200",
      };
    const num = parseFloat(val);
    if (isNaN(num))
      return {
        status: "TEXT",
        color: "text-slate-900",
        bg: "bg-white",
        border: "border-slate-200",
      };

    if (num < min)
      return {
        status: "LOW",
        color: "text-blue-700",
        bg: "bg-blue-50",
        border: "border-blue-300 ring-1 ring-blue-500/20",
      };
    if (num > max)
      return {
        status: "HIGH",
        color: "text-rose-700",
        bg: "bg-rose-50",
        border: "border-rose-300 ring-1 ring-rose-500/20",
      };

    return {
      status: "NORMAL",
      color: "text-emerald-700",
      bg: "bg-white",
      border: "border-slate-200 focus:border-emerald-500",
    };
  };

  // Dummy function for Machine Interface Simulation
  const handleIoTSync = () => {
    setIsSyncingIoT(true);
    setTimeout(() => {
      setIsSyncingIoT(false);
      toast.success("Synchronized with LIS Analyzers!");
    }, 1500);
  };

  const filteredWorklist = worklist.filter(
    (inv) =>
      inv.patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="flex-1 p-4 md:p-6 max-w-[1800px] mx-auto w-full h-[calc(100vh-theme(spacing.16))] flex flex-col animate-in fade-in duration-500">
      {/* HEADER & TABS */}
      <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 flex items-center gap-3">
            Clinical Results Entry
            <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 font-bold uppercase tracking-wider text-[10px]">
              Live Data
            </Badge>
          </h1>
          <p className="text-slate-500 font-medium mt-1">
            Process patient parameters, add diagnostic impressions, and finalize
            reports.
          </p>
        </div>

        {/* Status Tabs */}
        <div className="flex bg-slate-200/60 p-1 rounded-xl w-full md:w-auto overflow-x-auto custom-scrollbar shadow-inner">
          {[
            { id: "PENDING", label: "Pending Entry", icon: Activity },
            { id: "DRAFT", label: "Saved Drafts", icon: Save },
            {
              id: "NEEDS_APPROVAL",
              label: "Needs Approval",
              icon: AlertCircle,
            },
            { id: "COMPLETED", label: "Completed", icon: CheckCircle2 },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as TabStatus);
                  setSelectedInvoice(null);
                }}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-lg whitespace-nowrap transition-all duration-200 ${
                  activeTab === tab.id
                    ? "bg-white text-indigo-600 shadow-sm"
                    : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                }`}
              >
                <Icon
                  className={`w-4 h-4 ${activeTab === tab.id ? "text-indigo-500" : "text-slate-400"}`}
                />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0 relative">
        {/* ========================================================= */}
        {/* LEFT PANE: WORKLIST QUEUE                                 */}
        {/* ========================================================= */}
        <Card
          className={`w-full lg:w-[380px] shrink-0 flex flex-col border-slate-200 shadow-sm overflow-hidden bg-white ${selectedInvoice ? "hidden lg:flex" : "flex"}`}
        >
          <div className="p-4 border-b border-slate-100 bg-slate-50/80">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input
                placeholder="Search Patient or SID..."
                className="pl-9 bg-white h-11 rounded-xl border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/20 shadow-sm text-sm font-medium"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2 bg-slate-50/50">
            {isLoading ? (
              <div className="p-8 text-center text-slate-400 flex flex-col items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin mb-3 text-indigo-400" />
                <p className="text-sm font-bold tracking-wide uppercase">
                  Syncing Queue...
                </p>
              </div>
            ) : filteredWorklist.length === 0 ? (
              <div className="p-8 text-center text-slate-400 flex flex-col items-center justify-center h-full">
                <CheckCircle2 className="w-12 h-12 mb-3 text-emerald-200" />
                <p className="font-bold text-slate-600 text-lg">
                  Queue is empty!
                </p>
                <p className="text-sm mt-1">
                  No tasks currently in this status.
                </p>
              </div>
            ) : (
              filteredWorklist.map((inv) => (
                <button
                  key={inv.invoiceId}
                  onClick={() => handleSelectInvoice(inv)}
                  className={`w-full text-left p-4 rounded-2xl transition-all duration-200 border group ${
                    selectedInvoice?.invoiceId === inv.invoiceId
                      ? "bg-indigo-50 border-indigo-200 shadow-sm ring-1 ring-indigo-500/20"
                      : "bg-white border-slate-200 hover:border-indigo-300 hover:shadow-md"
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span
                      className={`font-bold text-sm truncate pr-2 ${selectedInvoice?.invoiceId === inv.invoiceId ? "text-indigo-900" : "text-slate-900 group-hover:text-indigo-700"}`}
                    >
                      {inv.patient.name}
                    </span>
                    <span className="text-[10px] text-slate-500 font-bold bg-slate-100 px-2 py-1 rounded-md shrink-0 border border-slate-200">
                      {format(new Date(inv.createdAt), "dd MMM, HH:mm")}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-3">
                    <span className="font-mono text-slate-400">
                      {inv.invoiceNumber}
                    </span>
                    <span>•</span>
                    <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px] uppercase font-bold text-slate-500">
                      {inv.patient.age}y {inv.patient.gender.charAt(0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex -space-x-1">
                      {inv.tests.slice(0, 3).map((t, i) => (
                        <Badge
                          key={i}
                          className="bg-slate-800 border-white text-[9px] px-1.5 py-0"
                        >
                          {t.testName.substring(0, 3).toUpperCase()}
                        </Badge>
                      ))}
                      {inv.tests.length > 3 && (
                        <Badge className="bg-slate-300 text-slate-700 border-white text-[9px] px-1.5 py-0">
                          +{inv.tests.length - 3}
                        </Badge>
                      )}
                    </div>
                    <ChevronRight
                      className={`w-4 h-4 transition-transform ${selectedInvoice?.invoiceId === inv.invoiceId ? "text-indigo-600 translate-x-1" : "text-slate-300"}`}
                    />
                  </div>
                </button>
              ))
            )}
          </div>
        </Card>

        {/* ========================================================= */}
        {/* RIGHT PANE: DATA ENTRY WORKSTATION                        */}
        {/* ========================================================= */}
        <Card
          className={`w-full flex-1 flex-col border-slate-200 shadow-sm overflow-hidden bg-slate-50 ${!selectedInvoice ? "hidden lg:flex" : "flex"}`}
        >
          {!selectedInvoice ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 bg-white/50">
              <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center mb-6 shadow-inner border border-indigo-100/50">
                <Microscope className="w-10 h-10 text-indigo-300" />
              </div>
              <h3 className="text-xl font-bold text-slate-600">
                Workstation Ready
              </h3>
              <p className="text-sm font-medium mt-2 max-w-sm text-center">
                Select an invoice from the queue on the left to begin entering
                clinical parameters.
              </p>
            </div>
          ) : (
            <>
              {/* --- PATIENT HEADER BANNER --- */}
              <div className="bg-white border-b border-slate-200 p-4 md:p-6 shrink-0 relative overflow-hidden">
                <div className="absolute right-0 top-0 w-64 h-full bg-gradient-to-l from-indigo-50/50 to-transparent pointer-events-none" />

                {/* Mobile Back Button */}
                <button
                  onClick={() => setSelectedInvoice(null)}
                  className="lg:hidden mb-4 flex items-center text-sm font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg w-max"
                >
                  <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Queue
                </button>

                <div className="flex flex-col xl:flex-row justify-between xl:items-center gap-4 relative z-10">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-indigo-500/30">
                      {selectedInvoice.patient.name.charAt(0)}
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                        {selectedInvoice.patient.name}
                      </h2>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-1.5 text-xs font-bold text-slate-500 uppercase tracking-wide">
                        <span className="flex items-center gap-1.5 bg-slate-100 px-2 py-1 rounded-md">
                          <User className="w-3.5 h-3.5 text-slate-400" />{" "}
                          {selectedInvoice.patient.age} Yrs •{" "}
                          {selectedInvoice.patient.gender}
                        </span>
                        <span className="flex items-center gap-1.5 bg-slate-100 px-2 py-1 rounded-md">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />{" "}
                          {selectedInvoice.patient.phone}
                        </span>
                        <span className="flex items-center gap-1.5 bg-slate-100 px-2 py-1 rounded-md font-mono">
                          <FileText className="w-3.5 h-3.5 text-slate-400" />{" "}
                          SID: {selectedInvoice.invoiceNumber}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* IoT SYNC BUTTON (Enterprise Feature) */}
                    {activeTab !== "COMPLETED" && (
                      <Button
                        variant="outline"
                        onClick={handleIoTSync}
                        disabled={isSyncingIoT}
                        className="h-10 border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 font-bold rounded-xl shadow-sm transition-all"
                      >
                        {isSyncingIoT ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <MonitorCheck className="w-4 h-4 mr-2" />
                        )}
                        {isSyncingIoT
                          ? "Connecting to LIS..."
                          : "Fetch Machine Data"}
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* --- DYNAMIC TEST ENTRY SCROLL AREA --- */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6 space-y-8 bg-slate-50/50">
                {selectedInvoice.tests.map((test) => (
                  <div
                    key={test.id}
                    className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2"
                  >
                    {/* Test Title Strip */}
                    <div className="bg-slate-900 px-5 py-3.5 flex items-center justify-between">
                      <h3 className="font-bold text-white tracking-wide text-sm md:text-base flex items-center gap-2">
                        <Activity className="w-4 h-4 text-indigo-400" />{" "}
                        {test.testName}
                      </h3>
                      <Badge
                        variant="outline"
                        className={`border-slate-700 text-[10px] uppercase font-bold tracking-widest ${test.status === "COMPLETED" ? "text-emerald-400" : "text-slate-300"}`}
                      >
                        {test.status}
                      </Badge>
                    </div>

                    {/* Parameter Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left whitespace-nowrap">
                        <thead className="bg-slate-50 border-b border-slate-200 text-xs font-black text-slate-500 uppercase tracking-widest">
                          <tr>
                            <th className="px-5 py-4 w-1/3">
                              Parameter Definition
                            </th>
                            <th className="px-5 py-4 w-56">Observed Value</th>
                            <th className="px-5 py-4 w-32">Flag</th>
                            <th className="px-5 py-4 w-24">Unit</th>
                            <th className="px-5 py-4">Biological Reference</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {test.results.map((param) => {
                            const evalResult = evaluateResult(
                              paramValues[param.id],
                              param.refRangeMin,
                              param.refRangeMax,
                            );

                            return (
                              <tr
                                key={param.id}
                                className="hover:bg-slate-50/50 transition-colors group"
                              >
                                <td className="px-5 py-4 font-bold text-slate-800 flex items-center gap-2">
                                  {param.parameterName}
                                </td>
                                <td className="px-5 py-3">
                                  <div className="relative">
                                    <Input
                                      className={`h-11 rounded-xl text-base font-bold shadow-none transition-all ${evalResult.bg} ${evalResult.color} ${evalResult.border}`}
                                      value={paramValues[param.id] || ""}
                                      readOnly={activeTab === "COMPLETED"}
                                      onChange={(e) =>
                                        setParamValues((p) => ({
                                          ...p,
                                          [param.id]: e.target.value,
                                        }))
                                      }
                                      placeholder="---"
                                      autoComplete="off"
                                    />
                                  </div>
                                </td>
                                <td className="px-5 py-3">
                                  {evalResult.status === "LOW" && (
                                    <Badge className="bg-blue-100 hover:bg-blue-100 text-blue-700 border-none font-black px-2 py-1">
                                      <ArrowDown
                                        className="w-3 h-3 mr-1"
                                        strokeWidth={3}
                                      />{" "}
                                      LOW
                                    </Badge>
                                  )}
                                  {evalResult.status === "HIGH" && (
                                    <Badge className="bg-rose-100 hover:bg-rose-100 text-rose-700 border-none font-black px-2 py-1">
                                      <ArrowUp
                                        className="w-3 h-3 mr-1"
                                        strokeWidth={3}
                                      />{" "}
                                      HIGH
                                    </Badge>
                                  )}
                                  {evalResult.status === "NORMAL" &&
                                    paramValues[param.id] && (
                                      <Badge className="bg-emerald-50 hover:bg-emerald-50 text-emerald-600 border-none font-bold px-2 py-1">
                                        <Check
                                          className="w-3 h-3 mr-1"
                                          strokeWidth={3}
                                        />{" "}
                                        NORMAL
                                      </Badge>
                                    )}
                                </td>
                                <td className="px-5 py-3 text-slate-500 font-bold text-xs">
                                  {param.unit || "-"}
                                </td>
                                <td className="px-5 py-3 text-xs font-semibold text-slate-600 bg-slate-50/30">
                                  {param.refRangeMin !== null &&
                                  param.refRangeMax !== null ? (
                                    <span className="bg-slate-100 px-2 py-1 rounded border border-slate-200">
                                      {param.refRangeMin} - {param.refRangeMax}
                                    </span>
                                  ) : (
                                    param.refRangeText || "-"
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Notes & Impression Block */}
                    <div className="p-5 bg-slate-50 border-t border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-indigo-500" />{" "}
                          Internal Lab Notes
                        </label>
                        <Textarea
                          readOnly={activeTab === "COMPLETED"}
                          value={testNotes[test.id] || ""}
                          onChange={(e) =>
                            setTestNotes((p) => ({
                              ...p,
                              [test.id]: e.target.value,
                            }))
                          }
                          placeholder="Add specific remarks or technical notes..."
                          className="resize-none h-20 bg-white border-slate-200 rounded-xl text-sm focus:border-indigo-500 shadow-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                          <ClipboardSignature className="w-3.5 h-3.5 text-violet-500" />{" "}
                          Doctor's Clinical Impression
                        </label>
                        <Textarea
                          readOnly={activeTab === "COMPLETED"}
                          value={testImpressions[test.id] || ""}
                          onChange={(e) =>
                            setTestImpressions((p) => ({
                              ...p,
                              [test.id]: e.target.value,
                            }))
                          }
                          placeholder="Final clinical impression (prints on official report)..."
                          className="resize-none h-20 bg-white border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:border-violet-500 shadow-sm"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* --- ACTION FOOTER --- */}
              <div className="p-4 border-t border-slate-200 bg-white/80 backdrop-blur flex flex-wrap justify-between gap-3 items-center shrink-0 z-10 relative">
                {activeTab !== "COMPLETED" ? (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => handleAction("SAVE_DRAFT")}
                      disabled={saveResultsMutation.isPending}
                      className="h-12 rounded-xl font-bold text-slate-700 bg-white hover:bg-slate-50 border-slate-300 shadow-sm w-full sm:w-auto"
                    >
                      <Save className="w-4 h-4 mr-2" /> Save Draft
                    </Button>

                    <div className="flex gap-3 w-full sm:w-auto">
                      <Button
                        variant="outline"
                        onClick={() => handleAction("REQUEST_APPROVAL")}
                        disabled={saveResultsMutation.isPending}
                        className="flex-1 sm:flex-none h-12 rounded-xl font-bold border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100 shadow-sm"
                      >
                        Send to Pathologist
                      </Button>
                      <Button
                        onClick={() => handleAction("APPROVE")}
                        disabled={saveResultsMutation.isPending}
                        className="flex-1 sm:flex-none h-12 rounded-xl px-8 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-black shadow-lg shadow-emerald-500/30 transition-all hover:-translate-y-0.5 border-0"
                      >
                        {saveResultsMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                          <CheckCircle2 className="w-5 h-5 mr-2" />
                        )}
                        Approve & Lock
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-end w-full">
                    <Button
                      onClick={handleDownloadReport}
                      className="h-12 rounded-xl px-8 bg-indigo-600 hover:bg-indigo-700 text-white font-black shadow-md border-0"
                    >
                      <Printer className="w-4 h-4 mr-2" />
                      Download Final Report
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
