"use client";

import { useState, useEffect } from "react";
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
} from "lucide-react";
import toast from "react-hot-toast";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

// --- TYPES (Updated for Invoice-Centric Architecture) ---
interface TestResultParam {
  id: string; // The LabTestResult ID
  parameterName: string;
  unit: string | null;
  refRangeMin: number | null;
  refRangeMax: number | null;
  refRangeText: string | null;
  value: string | null;
}

interface LabTestRecord {
  id: string; // The LabTest ID
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
  patient: { name: string; age: number; gender: string; phone: string };
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

  // Form State dictionaries (keyed by their respective IDs)
  const [paramValues, setParamValues] = useState<Record<string, string>>({});
  const [testNotes, setTestNotes] = useState<Record<string, string>>({});
  const [testImpressions, setTestImpressions] = useState<
    Record<string, string>
  >({});

  // 1. FETCH WORKLIST
  const { data: worklist = [], isLoading } = useQuery<InvoiceWorklist[]>({
    queryKey: ["worklist", activeTab],
    queryFn: async () => {
      // In your backend, you'll filter invoices that contain tests matching this status
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

  // --- UI HELPERS ---
  const getFlagColor = (
    val: string,
    min: number | null,
    max: number | null,
  ) => {
    if (!val || min === null || max === null) return "text-slate-900";
    const num = parseFloat(val);
    if (isNaN(num)) return "text-slate-900";
    if (num < min) return "text-blue-700 font-black bg-blue-50";
    if (num > max) return "text-rose-700 font-black bg-rose-50";
    return "text-slate-900 font-medium";
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
          <h1 className="text-3xl font-black tracking-tight text-slate-900">
            Clinical Results Entry
          </h1>
          <p className="text-slate-500 font-medium mt-1">
            Process patient parameters, add diagnostic impressions, and finalize
            reports.
          </p>
        </div>

        {/* Status Tabs */}
        <div className="flex bg-slate-100 p-1 rounded-xl w-full md:w-auto overflow-x-auto custom-scrollbar">
          {[
            { id: "PENDING", label: "Not Entered" },
            { id: "DRAFT", label: "Saved Drafts" },
            { id: "NEEDS_APPROVAL", label: "Dr. Approval" },
            { id: "COMPLETED", label: "Completed" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as TabStatus);
                setSelectedInvoice(null);
              }}
              className={`px-4 py-2 text-sm font-bold rounded-lg whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
        {/* ========================================================= */}
        {/* LEFT PANE: WORKLIST QUEUE                                 */}
        {/* ========================================================= */}
        <Card className="w-full lg:w-[350px] shrink-0 flex flex-col border-slate-200 shadow-sm overflow-hidden bg-white">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input
                placeholder="Search Patient or Invoice..."
                className="pl-9 bg-white h-10 rounded-xl border-slate-200 focus:border-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2 bg-slate-50/30">
            {isLoading ? (
              <div className="p-8 text-center text-slate-400 flex flex-col items-center justify-center h-full">
                <Loader2 className="w-6 h-6 animate-spin mb-2" />
                <p className="text-sm font-medium">Syncing worklist...</p>
              </div>
            ) : filteredWorklist.length === 0 ? (
              <div className="p-8 text-center text-slate-400 flex flex-col items-center justify-center h-full">
                <CheckCircle2 className="w-10 h-10 mb-3 text-slate-200" />
                <p className="font-medium text-slate-500">Queue is empty!</p>
                <p className="text-xs mt-1">No tasks in this status.</p>
              </div>
            ) : (
              filteredWorklist.map((inv) => (
                <button
                  key={inv.invoiceId}
                  onClick={() => handleSelectInvoice(inv)}
                  className={`w-full text-left p-4 rounded-2xl transition-all border ${
                    selectedInvoice?.invoiceId === inv.invoiceId
                      ? "bg-blue-50 border-blue-200 shadow-sm ring-1 ring-blue-500/20"
                      : "bg-white border-slate-200 hover:border-blue-300 hover:shadow-sm"
                  }`}>
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-bold text-slate-900 text-sm truncate pr-2">
                      {inv.patient.name}
                    </span>
                    <span className="text-[10px] text-slate-500 font-bold bg-slate-100 px-2 py-0.5 rounded-md">
                      {format(new Date(inv.createdAt), "dd MMM")}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-3">
                    <span>{inv.invoiceNumber}</span>
                    <span>•</span>
                    <span>
                      {inv.patient.age}y {inv.patient.gender.charAt(0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <Badge
                      variant="secondary"
                      className="bg-slate-100 text-slate-600 border-0 text-[10px]">
                      {inv.tests.length} Test(s)
                    </Badge>
                    <ChevronRight
                      className={`w-4 h-4 ${selectedInvoice?.invoiceId === inv.invoiceId ? "text-blue-600" : "text-slate-300"}`}
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
        <Card className="w-full flex-1 flex flex-col border-slate-200 shadow-sm overflow-hidden bg-slate-50">
          {!selectedInvoice ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 bg-white">
              <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                <Microscope className="w-10 h-10 text-slate-300" />
              </div>
              <h3 className="text-xl font-bold text-slate-600">
                No Patient Selected
              </h3>
              <p className="text-sm font-medium mt-2 max-w-sm text-center">
                Select an invoice from the worklist on the left to begin
                entering diagnostic parameters.
              </p>
            </div>
          ) : (
            <>
              {/* --- PATIENT HEADER BANNER --- */}
              <div className="bg-white border-b border-slate-200 p-6 shrink-0">
                <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black text-xl shadow-md">
                      {selectedInvoice.patient.name.charAt(0)}
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                        {selectedInvoice.patient.name}
                      </h2>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm font-medium text-slate-600">
                        <span className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-slate-400" />{" "}
                          {selectedInvoice.patient.age} Yrs •{" "}
                          {selectedInvoice.patient.gender}
                        </span>
                        <span className="flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />{" "}
                          {selectedInvoice.patient.phone}
                        </span>
                        <span className="flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5 text-slate-400" />{" "}
                          SID: {selectedInvoice.invoiceNumber}
                        </span>
                        {selectedInvoice.referredBy && (
                          <span className="flex items-center gap-1 text-indigo-600">
                            <Stethoscope className="w-3.5 h-3.5" /> Ref:{" "}
                            {selectedInvoice.referredBy}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Badge className="bg-blue-50 text-blue-700 border-blue-200 uppercase px-3 py-1 text-xs tracking-widest font-black">
                    {activeTab.replace("_", " ")}
                  </Badge>
                </div>
              </div>

              {/* --- DYNAMIC TEST ENTRY SCROLL AREA --- */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
                {selectedInvoice.tests.map((test) => (
                  <div
                    key={test.id}
                    className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2">
                    {/* Test Title Strip */}
                    <div className="bg-slate-900 px-5 py-3 flex items-center justify-between">
                      <h3 className="font-bold text-white tracking-wide">
                        {test.testName}
                      </h3>
                      <Badge
                        variant="outline"
                        className="border-slate-700 text-slate-300 text-[10px] uppercase">
                        {test.status}
                      </Badge>
                    </div>

                    {/* Parameter Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50/80 border-b border-slate-100 text-xs font-bold text-slate-500 uppercase tracking-widest">
                          <tr>
                            <th className="px-5 py-3 w-1/3">Parameter</th>
                            <th className="px-5 py-3 w-48">Result Value</th>
                            <th className="px-5 py-3">Unit</th>
                            <th className="px-5 py-3">Reference Range</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {test.results.map((param) => (
                            <tr
                              key={param.id}
                              className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-5 py-3 font-semibold text-slate-800">
                                {param.parameterName}
                              </td>
                              <td className="px-5 py-3">
                                <div className="relative">
                                  <Input
                                    className={`h-11 rounded-xl text-base shadow-none transition-all focus-visible:ring-blue-500 ${getFlagColor(paramValues[param.id], param.refRangeMin, param.refRangeMax)}`}
                                    value={paramValues[param.id] || ""}
                                    onChange={(e) =>
                                      setParamValues((p) => ({
                                        ...p,
                                        [param.id]: e.target.value,
                                      }))
                                    }
                                    placeholder="Value"
                                    autoComplete="off"
                                  />
                                  {/* Auto-flagging Warning Icon */}
                                  {getFlagColor(
                                    paramValues[param.id],
                                    param.refRangeMin,
                                    param.refRangeMax,
                                  ).includes("red") && (
                                    <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-red-500 pointer-events-none" />
                                  )}
                                </div>
                              </td>
                              <td className="px-5 py-3 text-slate-500 font-medium">
                                {param.unit || "-"}
                              </td>
                              <td className="px-5 py-3 text-xs font-medium text-slate-500 bg-slate-50/50">
                                {param.refRangeMin !== null &&
                                param.refRangeMax !== null
                                  ? `${param.refRangeMin} - ${param.refRangeMax}`
                                  : param.refRangeText || "-"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Notes & Impression Block */}
                    <div className="p-5 bg-slate-50 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                          <FileText className="w-3.5 h-3.5" /> Internal Notes /
                          Remarks
                        </label>
                        <Textarea
                          value={testNotes[test.id] || ""}
                          onChange={(e) =>
                            setTestNotes((p) => ({
                              ...p,
                              [test.id]: e.target.value,
                            }))
                          }
                          placeholder="Add specific remarks for this test..."
                          className="resize-none h-20 bg-white border-slate-200 rounded-xl"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                          <ClipboardSignature className="w-3.5 h-3.5" />{" "}
                          Doctor's Impression
                        </label>
                        <Textarea
                          value={testImpressions[test.id] || ""}
                          onChange={(e) =>
                            setTestImpressions((p) => ({
                              ...p,
                              [test.id]: e.target.value,
                            }))
                          }
                          placeholder="Final clinical impression (prints on report)..."
                          className="resize-none h-20 bg-white border-slate-200 rounded-xl font-medium"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* --- ACTION FOOTER --- */}
              <div className="p-4 border-t border-slate-200 bg-white flex flex-wrap justify-between gap-3 items-center shrink-0 z-10 relative">
                <Button
                  variant="outline"
                  onClick={() => handleAction("SAVE_DRAFT")}
                  disabled={saveResultsMutation.isPending}
                  className="h-12 rounded-xl font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 border-slate-200">
                  <Save className="w-4 h-4 mr-2" /> Save Draft
                </Button>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => handleAction("REQUEST_APPROVAL")}
                    disabled={saveResultsMutation.isPending}
                    className="h-12 rounded-xl font-bold border-amber-200 text-amber-700 hover:bg-amber-50">
                    Send for Dr. Approval
                  </Button>
                  <Button
                    onClick={() => handleAction("APPROVE")}
                    disabled={saveResultsMutation.isPending}
                    className="h-12 rounded-xl px-8 bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-lg shadow-emerald-500/20">
                    {saveResultsMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                    )}
                    Verify & Finalize Report
                  </Button>
                </div>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
