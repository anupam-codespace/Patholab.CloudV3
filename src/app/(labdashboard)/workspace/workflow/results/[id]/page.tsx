"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Save,
  Send,
  ArrowLeft,
  AlertTriangle,
  CheckCircle,
  FlaskConical,
  User,
  Activity,
  Info,
  Printer,
  ShieldCheck,
  FileText,
  Clock,
  Unlock,
  Keyboard,
  Loader2,
} from "lucide-react";
import toast from "react-hot-toast";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Link from "next/link";

import { CustomFieldInput } from "@/components/workflow/custom-field-input";

// HELPER 1: Range Checker
const checkRange = (val: string, ranges: any[]) => {
  if (!val || isNaN(Number(val)) || !ranges || ranges.length === 0)
    return { status: "NORMAL", color: "text-slate-700", bg: "" };

  const num = Number(val);
  const range = ranges[0];

  if (!range) return { status: "NORMAL", color: "text-slate-700", bg: "" };

  if (range.criticalLow != null && num <= range.criticalLow)
    return { status: "CRITICAL LOW", color: "text-red-700 font-bold", bg: "bg-red-50/80" };
  if (range.criticalHigh != null && num >= range.criticalHigh)
    return { status: "CRITICAL HIGH", color: "text-red-700 font-bold", bg: "bg-red-50/80" };
  if (range.lowValue != null && num < range.lowValue)
    return { status: "LOW", color: "text-amber-600 font-bold", bg: "bg-amber-50/50" };
  if (range.highValue != null && num > range.highValue)
    return { status: "HIGH", color: "text-amber-600 font-bold", bg: "bg-amber-50/50" };

  return { status: "NORMAL", color: "text-emerald-600 font-bold", bg: "" };
};

// HELPER 2: Unified Parameter Generator
const getTestParameters = (test: any) => {
  const list: any[] = [];
  const templateParams = test.testTemplate?.parameters || [];
  
  templateParams.forEach((tp: any) => {
    list.push({
      name: tp.parameter.name,
      ranges: tp.parameter.referenceRanges || [],
      unit: tp.parameter.unit,
      source: "template",
    });
  });

  const existingResults = test.results || [];
  existingResults.forEach((res: any) => {
    if (!list.find((item) => item.name === res.parameterName)) {
      list.push({
        name: res.parameterName,
        ranges: [],
        unit: res.unit,
        source: "result",
      });
    }
  });

  if (list.length === 0) {
    list.push({ name: test.testName, ranges: [], unit: "", source: "fallback" });
  }

  return list;
};

export default function ResultEntryPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const patientId = params.id as string;

  const [results, setResults] = useState<Record<string, string>>({});
  const [activeAction, setActiveAction] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") router.push("/workspace");
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router]);

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault(); 
      const inputs = Array.from(document.querySelectorAll<HTMLInputElement>(".result-data-input:not([disabled])"));
      const currentIndex = inputs.indexOf(e.currentTarget);
      
      if (currentIndex > -1 && currentIndex < inputs.length - 1) {
        inputs[currentIndex + 1].focus();
        inputs[currentIndex + 1].select();
      }
    }
  };

  const { data: patient, isLoading } = useQuery({
    queryKey: ["worksheet", patientId],
    queryFn: async () => {
      const res = await fetch(`/api/workspace/workflow/results/${patientId}`);
      if (!res.ok) throw new Error("Failed to load worksheet");
      return res.json();
    },
    staleTime: 0,
  });

  const { data: staffList = [] } = useQuery({
    queryKey: ["lab-staff"],
    queryFn: async () => {
      const res = await fetch(`/api/workspace/staff`);
      if (!res.ok) return [];
      return res.json();
    },
  });

  useEffect(() => {
    if (patient?.tests) {
      const initial: Record<string, string> = {};
      
      // We only want to generate a "fallback" NOW date once so both fields match perfectly if missing
      const fallbackNow = new Date();
      fallbackNow.setMinutes(fallbackNow.getMinutes() - fallbackNow.getTimezoneOffset());
      const formattedNow = fallbackNow.toISOString().slice(0, 16);

      patient.tests.forEach((t: any) => {
        t.results.forEach((r: any) => {
          initial[`${t.id}_${r.parameterName}`] = r.value;
        });
        if (t.customResults) {
          t.customResults.forEach((cr: any) => {
            initial[`${t.id}_CF_${cr.fieldDefId}`] = cr.value;
          });
        }
        if (t.notes) initial[`${t.id}_NOTES`] = t.notes;
        if (t.impression) initial[`${t.id}_IMPRESSION`] = t.impression;

        // ✅ HANDLE COLLECTED TIME
        if (t.sampleCollectedAt) {
          const d = new Date(t.sampleCollectedAt);
          d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
          initial[`${t.id}_COLLECTED`] = d.toISOString().slice(0, 16);
        } else {
          initial[`${t.id}_COLLECTED`] = formattedNow;
        }

        // ✅ HANDLE RECEIVED TIME
        if (t.sampleReceivedAt) {
          const d = new Date(t.sampleReceivedAt);
          d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
          initial[`${t.id}_RECEIVED`] = d.toISOString().slice(0, 16);
        } else {
          initial[`${t.id}_RECEIVED`] = formattedNow;
        }

        if (t.checkedBy) initial[`${t.id}_CHECKED_BY`] = t.checkedBy;
        if (t.approvedBy) initial[`${t.id}_APPROVED_BY`] = t.approvedBy;
      });
      setResults(initial);
    }
  }, [patient]);

  const actionMutation = useMutation({
    mutationFn: async ({ testId, action }: { testId: string; action: string }) => {
      setActiveAction(`${testId}_${action}`); 
      const test = patient.tests.find((t: any) => t.id === testId);
      const parametersToSave = getTestParameters(test);

      const payload = parametersToSave.map((p: any) => {
        const val = results[`${testId}_${p.name}`] || "";
        const check = checkRange(val, p.ranges);

        return {
          parameterName: p.name,
          value: val,
          unit: p.unit,
          isAbnormal: check.status !== "NORMAL",
          isCritical: check.status.includes("CRITICAL"),
          id: test.results.find((r: any) => r.parameterName === p.name)?.id,
        };
      });

      const customPayload = test.testTemplate?.customFields?.map((cf: any) => ({
          fieldDefId: cf.fieldDefId,
          value: results[`${testId}_CF_${cf.fieldDefId}`] || "",
      })) || [];

      const res = await fetch(`/api/workspace/workflow/results/${patientId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          testId,
          results: payload,
          customResults: customPayload,
          action,
          notes: results[`${testId}_NOTES`],
          impression: results[`${testId}_IMPRESSION`],
          sampleCollectedAt: results[`${testId}_COLLECTED`], // ✅ NEW
          sampleReceivedAt: results[`${testId}_RECEIVED`],
          checkedById: results[`${testId}_CHECKED_BY`], 
          approvedById: results[`${testId}_APPROVED_BY`],
        }),
      });

      if (!res.ok) throw new Error("Action failed");
      return res.json();
    },
    onSuccess: (_, variables) => {
      let msg = "Saved Successfully";
      if (variables.action === "APPROVE") msg = "Approved & Signed";
      if (variables.action === "UNLOCK") msg = "Test Unlocked for Editing";
      toast.success(msg);
      queryClient.invalidateQueries({ queryKey: ["worksheet", patientId] });
      setActiveAction(null);
    },
    onError: () => {
      toast.error("Operation failed");
      setActiveAction(null);
    },
  });

  if (isLoading)
    return (
      <div className="h-screen bg-slate-50 flex items-center justify-center space-x-3">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <span className="text-sm font-semibold text-slate-500 animate-pulse">Loading Clinical Worksheet...</span>
      </div>
    );
    
  if (!patient) return <div className="p-10 text-center font-semibold text-slate-500">Patient not found</div>;

  return (
    <div className="min-h-screen bg-slate-100 pb-20 selection:bg-blue-100 selection:text-blue-900">
      {/* HEADER */}
      <div className="bg-white border-b px-6 py-4 sticky top-0 z-10 shadow-[0_4px_20px_-15px_rgba(0,0,0,0.1)] flex justify-between items-center transition-all">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/workspace')} className="hover:bg-slate-100 rounded-full">
            <ArrowLeft className="h-5 w-5 text-slate-600" />
          </Button>
          <div>
            <h1 className="text-lg font-bold text-slate-900 leading-none tracking-tight">{patient.name}</h1>
            <div className="flex gap-4 text-[11px] text-slate-500 mt-1.5 font-medium uppercase tracking-wider">
              <span className="flex items-center gap-1">
                <User className="h-3.5 w-3.5 text-blue-500" /> {patient.age} {patient.ageUnit} • {patient.gender}
              </span>
              <span className="flex items-center gap-1">
                <FlaskConical className="h-3.5 w-3.5 text-emerald-500" /> PID: {patient.patientId}
              </span>
            </div>
          </div>
        </div>
        
        {/* Helper Badge for shortcuts */}
        <div className="flex items-center gap-3 text-[11px] font-semibold text-slate-500 uppercase">
          <span className="flex items-center gap-1.5 bg-slate-100 px-2 py-1 rounded border border-slate-200 shadow-sm">
             <Keyboard className="h-3 w-3 text-slate-400" /> ENTER = NEXT
          </span>
          <span className="flex items-center gap-1.5 bg-slate-100 px-2 py-1 rounded border border-slate-200 shadow-sm">
             ESC = CLOSE
          </span>
        </div>
      </div>

      <div className="max-w-[1100px] mx-auto p-4 space-y-4 mt-2">
        <Accordion
          type="multiple"
          defaultValue={patient.tests.map((t: any) => t.id)}
          className="space-y-5">
          {patient.tests.map((test: any) => {
            const isLocked = test.status === "APPROVED";
            const isReviewReady = test.status === "COMPLETED";
            const parametersToRender = getTestParameters(test);

            return (
              <AccordionItem
                key={test.id}
                value={test.id}
                className="bg-white border border-slate-200/60 rounded-xl shadow-sm px-0 overflow-hidden transition-all duration-300 group">
                
                <AccordionTrigger
                  className={`px-5 py-4 hover:no-underline transition-colors ${isLocked ? "bg-emerald-50/30 hover:bg-emerald-50/50" : "hover:bg-slate-50"}`}>
                  <div className="flex items-center gap-4 w-full">
                    <div className={`w-2.5 h-2.5 rounded-full shadow-sm ${isLocked ? "bg-emerald-500 shadow-emerald-200" : isReviewReady ? "bg-blue-500 shadow-blue-200" : "bg-amber-500 shadow-amber-200"}`} />
                    <div className="text-left flex-1">
                      <h3 className="text-[15px] font-bold text-slate-900 leading-none">
                        {test.testName}
                      </h3>
                      {test.testCode && (
                        <span className="text-[10px] font-mono text-slate-400 mt-1.5 block">{test.testCode}</span>
                      )}
                    </div>
                    <div className="mr-3">
                      {isLocked ? (
                        <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200 text-[10px] h-6 border-emerald-200 shadow-none px-3">
                          <ShieldCheck className="w-3.5 h-3.5 mr-1.5" /> Approved
                        </Badge>
                      ) : isReviewReady ? (
                        <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200 text-[10px] h-6 border-blue-200 shadow-none px-3">
                          Ready for Review
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-amber-700 border-amber-200 text-[10px] h-6 bg-amber-50 shadow-none px-3">
                          Data Entry
                        </Badge>
                      )}
                    </div>
                  </div>
                </AccordionTrigger>

                <AccordionContent className="px-0 pb-0">
                  {/* ✅ THE NEW SPLIT TIMESTAMPS ROW */}
                  <div className="bg-slate-50/80 px-5 py-3 border-y border-slate-200/60 grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    <div className="flex items-center gap-3">
                      <Label className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1.5 tracking-wider w-[120px]">
                        <Clock className="h-3.5 w-3.5 text-blue-500" /> Collected At:
                      </Label>
                      <Input
                        type="datetime-local"
                        className="h-8 flex-1 bg-white text-xs border-slate-200 focus-visible:ring-blue-500 shadow-sm"
                        value={results[`${test.id}_COLLECTED`] || ""}
                        onChange={(e) => setResults({ ...results, [`${test.id}_COLLECTED`]: e.target.value })}
                        disabled={isLocked}
                      />
                    </div>

                    <div className="flex items-center gap-3">
                      <Label className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1.5 tracking-wider w-[120px]">
                        <Clock className="h-3.5 w-3.5 text-indigo-500" /> Received At:
                      </Label>
                      <Input
                        type="datetime-local"
                        className="h-8 flex-1 bg-white text-xs border-slate-200 focus-visible:ring-indigo-500 shadow-sm"
                        value={results[`${test.id}_RECEIVED`] || ""}
                        onChange={(e) => setResults({ ...results, [`${test.id}_RECEIVED`]: e.target.value })}
                        disabled={isLocked}
                      />
                    </div>

                  </div>

                  <div className="overflow-x-auto relative">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-100/50 text-slate-500 font-bold border-b border-slate-200 text-[11px] uppercase tracking-wider">
                        <tr>
                          <th className="px-5 py-3 w-[35%]">Parameter</th>
                          <th className="px-5 py-3 w-[25%]">Result</th>
                          <th className="px-5 py-3 w-[10%]">Unit</th>
                          <th className="px-5 py-3 w-[20%]">Ref. Range</th>
                          <th className="px-5 py-3 w-[10%] text-center">Flag</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {parametersToRender.map((param: any) => {
                          const pName = param.name;
                          const range = param.ranges?.[0];
                          const key = `${test.id}_${pName}`;
                          const currentVal = results[key] || "";
                          const check = checkRange(currentVal, param.ranges);

                          return (
                            <tr
                              key={pName}
                              className={`transition-all duration-200 ease-in-out focus-within:bg-blue-50/40 focus-within:shadow-[inset_0_0_0_1px_rgba(59,130,246,0.1)] hover:bg-slate-50/50 ${check.bg}`}>
                              
                              <td className="px-5 py-2.5 font-semibold text-slate-800 text-[13px] align-middle">
                                {pName}
                              </td>

                              <td className="px-5 py-2 align-middle">
                                <Input
                                  className={`result-data-input h-9 font-mono font-bold text-[14px] border-slate-300 shadow-sm transition-all focus-visible:ring-2 focus-visible:ring-blue-500/50 focus-visible:border-blue-500 ${
                                    check.status !== "NORMAL" ? "bg-red-50 text-red-900 border-red-300 focus-visible:ring-red-500/50 focus-visible:border-red-500" : ""
                                  }`}
                                  value={currentVal}
                                  onKeyDown={handleInputKeyDown}
                                  onChange={(e) => setResults({ ...results, [key]: e.target.value })}
                                  disabled={isLocked}
                                  placeholder="---"
                                />
                              </td>

                              <td className="px-5 py-2.5 text-slate-500 text-[12px] font-medium align-middle">
                                {param.unit || "-"}
                              </td>

                              <td className="px-5 py-2.5 text-slate-500 text-[11px] align-middle leading-tight">
                                {range ? (
                                  range.textValue ? (
                                    <div className="whitespace-pre-wrap font-mono">{range.textValue}</div>
                                  ) : (
                                    <span>
                                      {range.customLabel && <span className="font-bold text-slate-700 mr-1.5">{range.customLabel}:</span>}
                                      {range.lowValue} - {range.highValue}
                                    </span>
                                  )
                                ) : (
                                  "-"
                                )}
                              </td>

                              <td className="px-5 py-2.5 align-middle text-center">
                                {check.status !== "NORMAL" && (
                                  <div className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-1 rounded border shadow-sm ${check.status.includes('CRITICAL') ? 'bg-red-100 text-red-800 border-red-200' : 'bg-amber-100 text-amber-800 border-amber-200'}`}>
                                    <AlertTriangle className="h-3 w-3" /> {check.status}
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* CUSTOM FIELDS */}
                  {test.testTemplate?.customFields?.length > 0 && (
                      <div className="bg-slate-50/50 p-5 border-t border-slate-200/60">
                        <h4 className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1.5 mb-4 tracking-wider">
                          <FileText className="h-3.5 w-3.5 text-indigo-400" /> Additional Inputs
                        </h4>
                        <div className="grid grid-cols-2 gap-5">
                          {test.testTemplate.customFields.map((cf: any) => {
                            const def = cf.fieldDef;
                            const key = `${test.id}_CF_${def.id}`;
                            const val = results[key] || "";
                            return (
                              <div key={def.id} className="text-sm" onKeyDown={(e) => { if(e.key === 'Enter') handleInputKeyDown(e as any); }}>
                                  <CustomFieldInput field={def} value={val} onChange={(newValue) => !isLocked && setResults((prev) => ({ ...prev, [key]: newValue }))} />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                  {/* NOTES, IMPRESSION & SIGNATURES */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border-t border-slate-200/60 bg-slate-50/50 md:divide-x divide-slate-200/60">
                    <div className="p-5 space-y-5">
                      <div>
                        <Label className="mb-2 flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                          <Info className="h-3.5 w-3.5 text-blue-500" /> Internal Lab Notes
                        </Label>
                        <Textarea
                          className="bg-white min-h-[60px] text-xs resize-none border-slate-200 focus-visible:ring-blue-500 shadow-sm"
                          value={results[`${test.id}_NOTES`] || ""}
                          onChange={(e) => setResults({ ...results, [`${test.id}_NOTES`]: e.target.value })}
                          disabled={isLocked}
                          placeholder="Type any internal notes..."
                        />
                      </div>
                      <div>
                         <Label className="mb-2 flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                           <User className="h-3.5 w-3.5 text-blue-500" /> Checked By (Technician)
                         </Label>
                         <Select
                            disabled={isLocked}
                            value={results[`${test.id}_CHECKED_BY`] || ""}
                            onValueChange={(val) => setResults({...results, [`${test.id}_CHECKED_BY`]: val})}
                         >
                            <SelectTrigger className="bg-white h-9 text-xs font-semibold border-slate-200 shadow-sm focus:ring-blue-500">
                              <SelectValue placeholder="Select Technician..." />
                            </SelectTrigger>
                            <SelectContent>
                               {staffList.map((staff: any) => {
                                  const staffName = staff.user?.name || "Unknown Staff";
                                  return (
                                    <SelectItem key={staff.id} value={staffName} className="text-xs font-medium">
                                      {staffName}
                                    </SelectItem>
                                  );
                               })}
                            </SelectContent>
                         </Select>
                      </div>
                    </div>

                    <div className="p-5 space-y-5">
                      <div>
                        <Label className="mb-2 flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                          <Activity className="h-3.5 w-3.5 text-emerald-500" /> Clinical Impression
                        </Label>
                        <Textarea
                          className="bg-white min-h-[60px] text-xs font-medium resize-none border-slate-200 focus-visible:ring-emerald-500 shadow-sm"
                          value={results[`${test.id}_IMPRESSION`] || ""}
                          onChange={(e) => setResults({ ...results, [`${test.id}_IMPRESSION`]: e.target.value })}
                          disabled={isLocked}
                          placeholder="Add clinical impression for report..."
                        />
                      </div>
                      <div>
                         <Label className="mb-2 flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                           <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" /> Approved & Signed By
                         </Label>
                         <Select
                            disabled={isLocked}
                            value={results[`${test.id}_APPROVED_BY`] || ""}
                            onValueChange={(val) => setResults({...results, [`${test.id}_APPROVED_BY`]: val})}
                         >
                            <SelectTrigger className="bg-white h-9 text-xs font-semibold border-slate-200 shadow-sm focus:ring-emerald-500">
                              <SelectValue placeholder="Select Doctor/Pathologist..." />
                            </SelectTrigger>
                            <SelectContent>
                               {staffList.map((staff: any) => {
                                  const staffName = staff.user?.name || "Unknown Staff";
                                  return (
                                    <SelectItem key={staff.id} value={staffName} className="text-xs font-medium">
                                      {staffName}
                                    </SelectItem>
                                  );
                               })}
                            </SelectContent>
                         </Select>
                      </div>
                    </div>
                  </div>

                  {/* ACTION FOOTER */}
                  <div className="bg-white p-4 border-t border-slate-200 flex justify-end gap-3 items-center rounded-b-xl">
                    {isLocked ? (
                      <>
                        <div className="mr-auto flex items-center gap-2">
                           <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 pointer-events-none px-3 py-1 shadow-none">
                             <ShieldCheck className="h-3.5 w-3.5 mr-1.5 text-emerald-500" /> 
                             Digitally Signed by {results[`${test.id}_APPROVED_BY`] || "Authorized Doctor"}
                           </Badge>
                        </div>
                        <Button 
                           variant="outline" 
                           className="h-9 text-xs font-bold text-amber-700 hover:text-amber-800 hover:bg-amber-50 border-amber-200 transition-all shadow-sm"
                           onClick={() => actionMutation.mutate({ testId: test.id, action: "UNLOCK" })}
                           disabled={activeAction !== null}
                        >
                          {activeAction === `${test.id}_UNLOCK` ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Unlock className="h-3.5 w-3.5 mr-1.5" />}
                          Unlock & Edit
                        </Button>
                        <Link href={`/workspace/reports/print/${patient.id}`} target="_blank">
                          <Button className="h-9 text-xs font-bold bg-slate-900 hover:bg-slate-800 transition-all shadow-md">
                            <Printer className="h-3.5 w-3.5 mr-1.5" /> Print Final Report
                          </Button>
                        </Link>
                      </>
                    ) : (
                      <>
                        <Button
                          variant="outline"
                          className="h-9 text-xs font-bold border-slate-200 text-slate-700 hover:bg-slate-50 transition-all shadow-sm"
                          onClick={() => actionMutation.mutate({ testId: test.id, action: "SAVE_DRAFT" })}
                          disabled={activeAction !== null}>
                          {activeAction === `${test.id}_SAVE_DRAFT` ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
                          Save Draft
                        </Button>
                        {isReviewReady ? (
                          <Button
                            className="h-9 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 transition-all shadow-md shadow-emerald-500/20"
                            onClick={() => actionMutation.mutate({ testId: test.id, action: "APPROVE" })}
                            disabled={activeAction !== null}>
                            {activeAction === `${test.id}_APPROVE` ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5 mr-1.5" />}
                            Approve & Sign
                          </Button>
                        ) : (
                          <Button
                            className="h-9 text-xs font-bold bg-blue-600 hover:bg-blue-700 transition-all shadow-md shadow-blue-500/20"
                            onClick={() => actionMutation.mutate({ testId: test.id, action: "SUBMIT_FOR_REVIEW" })}
                            disabled={activeAction !== null}>
                            {activeAction === `${test.id}_SUBMIT_FOR_REVIEW` ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : "Submit for Review"}
                            {activeAction !== `${test.id}_SUBMIT_FOR_REVIEW` && <Send className="h-3.5 w-3.5 ml-1.5" />}
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </div>
    </div>
  );
}