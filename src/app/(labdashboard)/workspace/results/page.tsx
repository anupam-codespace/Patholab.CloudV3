"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Activity,
  CheckCircle2,
  ChevronRight,
  ClipboardSignature,
  FlaskConical,
  Loader2,
  Search,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import toast from "react-hot-toast";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

// --- TYPES ---
interface TestResultParam {
  id: string;
  parameterName: string;
  unit: string | null;
  refRangeMin: number | null;
  refRangeMax: number | null;
  refRangeText: string | null;
  value: string; // The value technician types
}

interface PendingTest {
  id: string;
  testName: string;
  testNumber: string;
  status: string;
  createdAt: string;
  patient: { name: string; age: number; gender: string };
  results: TestResultParam[];
}

export default function ResultEntryPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTest, setSelectedTest] = useState<PendingTest | null>(null);

  // Store input values in a local dictionary: { [parameterId]: "value" }
  const [inputValues, setInputValues] = useState<Record<string, string>>({});

  // 1. FETCH PENDING TESTS
  const { data: pendingTests = [], isLoading } = useQuery<PendingTest[]>({
    queryKey: ["pending-results"],
    queryFn: async () => {
      const res = await fetch("/api/workspace/results/pending");
      if (!res.ok) throw new Error("Failed to fetch");
      return (await res.json()).tests;
    },
  });

  // 2. SUBMIT RESULTS & APPROVE MUTATION
  const approveMutation = useMutation({
    mutationFn: async (payload: {
      testId: string;
      results: Record<string, string>;
    }) => {
      const res = await fetch(
        `/api/workspace/results/${payload.testId}/approve`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ results: payload.results }),
        },
      );
      if (!res.ok) throw new Error("Failed to approve");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Results Approved! Report has been generated.");
      setSelectedTest(null);
      setInputValues({});
      queryClient.invalidateQueries({ queryKey: ["pending-results"] });
    },
    onError: () => toast.error("Failed to approve results."),
  });

  // --- HANDLERS ---
  const handleSelectTest = (test: PendingTest) => {
    setSelectedTest(test);
    // Pre-fill existing values if any
    const initialValues: Record<string, string> = {};
    test.results.forEach((r) => {
      initialValues[r.id] = r.value || "";
    });
    setInputValues(initialValues);
  };

  const handleInputChange = (paramId: string, value: string) => {
    setInputValues((prev) => ({ ...prev, [paramId]: value }));
  };

  const handleApprove = () => {
    if (!selectedTest) return;

    // Basic validation: ensure all fields have a value
    const missing = selectedTest.results.some(
      (r) => !inputValues[r.id] || inputValues[r.id].trim() === "",
    );
    if (
      missing &&
      !window.confirm("Some parameters are empty. Approve anyway?")
    )
      return;

    approveMutation.mutate({ testId: selectedTest.id, results: inputValues });
  };

  // --- UI HELPERS (Auto-flagging Logic for UI) ---
  const getFlagColor = (
    val: string,
    min: number | null,
    max: number | null,
  ) => {
    if (!val || min === null || max === null) return "text-slate-900";
    const num = parseFloat(val);
    if (isNaN(num)) return "text-slate-900";
    if (num < min) return "text-blue-600 font-bold bg-blue-50"; // LOW
    if (num > max) return "text-red-600 font-bold bg-red-50"; // HIGH
    return "text-slate-900"; // NORMAL
  };

  const filteredTests = pendingTests.filter(
    (t) =>
      t.patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.testNumber.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="flex-1 p-6 max-w-[1600px] mx-auto w-full h-[calc(100vh-theme(spacing.16))] flex flex-col animate-in fade-in duration-500">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Worklist & Result Entry
        </h1>
        <p className="text-muted-foreground">
          Enter test values, verify reference ranges, and generate reports.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
        {/* LEFT PANE: WORKLIST QUEUE */}
        <Card className="w-full lg:w-1/3 flex flex-col border-slate-200 shadow-sm overflow-hidden bg-white">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input
                placeholder="Search Worklist..."
                className="pl-9 bg-white"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
            {isLoading ? (
              <div className="p-8 text-center text-slate-400 flex flex-col items-center">
                <Loader2 className="w-6 h-6 animate-spin mb-2" /> Loading
                queue...
              </div>
            ) : filteredTests.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                Queue is empty! 🎉
              </div>
            ) : (
              filteredTests.map((test) => (
                <button
                  key={test.id}
                  onClick={() => handleSelectTest(test)}
                  className={`w-full text-left p-3 rounded-xl transition-all border ${
                    selectedTest?.id === test.id
                      ? "bg-blue-50 border-blue-200 shadow-sm"
                      : "bg-white border-transparent hover:bg-slate-50 hover:border-slate-200"
                  }`}>
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-bold text-slate-900 text-sm">
                      {test.patient.name}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {format(new Date(test.createdAt), "hh:mm a")}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-500 font-medium line-clamp-1">
                      {test.testName}
                    </span>
                    <ChevronRight
                      className={`w-4 h-4 ${selectedTest?.id === test.id ? "text-blue-600" : "text-slate-300"}`}
                    />
                  </div>
                </button>
              ))
            )}
          </div>
        </Card>

        {/* RIGHT PANE: DATA ENTRY FORM */}
        <Card className="w-full lg:w-2/3 flex flex-col border-slate-200 shadow-sm overflow-hidden bg-white">
          {!selectedTest ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8">
              <ClipboardSignature className="w-16 h-16 text-slate-200 mb-4" />
              <h3 className="text-lg font-medium text-slate-600">
                Select a test from the queue
              </h3>
              <p className="text-sm">
                Patient parameters will load here for data entry.
              </p>
            </div>
          ) : (
            <>
              {/* Patient & Test Header */}
              <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">
                    {selectedTest.patient.name}
                  </h2>
                  <p className="text-sm text-slate-500 font-medium mt-1">
                    {selectedTest.patient.age}y • {selectedTest.patient.gender}{" "}
                    | SID: {selectedTest.testNumber}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className="bg-amber-50 text-amber-700 border-amber-200 uppercase">
                  {selectedTest.status}
                </Badge>
              </div>

              {/* Data Entry Table */}
              <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30">
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                      <tr>
                        <th className="px-4 py-3">Parameter</th>
                        <th className="px-4 py-3 w-48">Result Value</th>
                        <th className="px-4 py-3">Unit</th>
                        <th className="px-4 py-3">Reference Range</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedTest.results.map((param) => (
                        <tr
                          key={param.id}
                          className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-4 py-4 font-medium text-slate-800">
                            {param.parameterName}
                          </td>
                          <td className="px-4 py-4">
                            <Input
                              className={`h-10 text-base font-medium shadow-none transition-colors focus-visible:ring-blue-500 ${getFlagColor(inputValues[param.id], param.refRangeMin, param.refRangeMax)}`}
                              value={inputValues[param.id] || ""}
                              onChange={(e) =>
                                handleInputChange(param.id, e.target.value)
                              }
                              placeholder="Enter value"
                              autoComplete="off"
                            />
                          </td>
                          <td className="px-4 py-4 text-slate-500">
                            {param.unit || "-"}
                          </td>
                          <td className="px-4 py-4 text-xs text-slate-500">
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
              </div>

              {/* Footer Actions */}
              <div className="p-4 border-t border-slate-100 bg-white flex justify-end gap-3 items-center shadow-[0_-4px_10px_rgba(0,0,0,0.02)]">
                <Button variant="outline" onClick={() => setSelectedTest(null)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleApprove}
                  disabled={approveMutation.isPending}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-500/20">
                  {approveMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                  )}
                  Approve & Generate Report
                </Button>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
