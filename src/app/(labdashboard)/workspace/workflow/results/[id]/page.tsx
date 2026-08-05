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
  Keyboard, // Added keyboard icon for hints
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

// ✅ HELPER 1: Range Checker
const checkRange = (val: string, ranges: any[]) => {
  if (!val || isNaN(Number(val)) || !ranges || ranges.length === 0)
    return { status: "NORMAL", color: "text-foreground" };

  const num = Number(val);
  const range = ranges[0];

  if (!range) return { status: "NORMAL", color: "text-foreground" };

  if (range.criticalLow != null && num <= range.criticalLow)
    return { status: "CRITICAL LOW", color: "text-red-700 font-bold" };
  if (range.criticalHigh != null && num >= range.criticalHigh)
    return { status: "CRITICAL HIGH", color: "text-red-700 font-bold" };
  if (range.lowValue != null && num < range.lowValue)
    return { status: "LOW", color: "text-orange-600 font-medium" };
  if (range.highValue != null && num > range.highValue)
    return { status: "HIGH", color: "text-orange-600 font-medium" };

  return { status: "NORMAL", color: "text-green-700" };
};

// ✅ HELPER 2: Unified Parameter Generator
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
    list.push({
      name: test.testName,
      ranges: [],
      unit: "",
      source: "fallback",
    });
  }

  return list;
};

export default function ResultEntryPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const patientId = params.id as string;

  const [results, setResults] = useState<Record<string, string>>({});

  // ✅ GLOBAL ESCAPE KEY SHORTCUT
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Allow Escape to close dropdowns first without routing back. 
      // If no dropdown/modal is stopping propagation, this triggers.
      if (e.key === "Escape") {
        router.push("/workspace");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router]);

  // ✅ ENTER KEY LOGIC FOR INPUTS
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault(); // Stop any form submission behaviors
      
      // Grab all inputs designated as result fields
      const inputs = Array.from(document.querySelectorAll<HTMLInputElement>(".result-data-input"));
      const currentIndex = inputs.indexOf(e.currentTarget);
      
      // Focus the next input in the DOM
      if (currentIndex > -1 && currentIndex < inputs.length - 1) {
        inputs[currentIndex + 1].focus();
        inputs[currentIndex + 1].select(); // Auto-select text for fast overwriting
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

        if (t.sampleReceivedAt) {
          const d = new Date(t.sampleReceivedAt);
          d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
          initial[`${t.id}_RECEIVED`] = d.toISOString().slice(0, 16);
        } else {
          const d = new Date();
          d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
          initial[`${t.id}_RECEIVED`] = d.toISOString().slice(0, 16);
        }

        if (t.checkedById) initial[`${t.id}_CHECKED_BY`] = t.checkedById;
        if (t.approvedById) initial[`${t.id}_APPROVED_BY`] = t.approvedById;
      });
      setResults(initial);
    }
  }, [patient]);

  const actionMutation = useMutation({
    mutationFn: async ({ testId, action }: { testId: string; action: string }) => {
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

      const customPayload =
        test.testTemplate?.customFields?.map((cf: any) => {
          const defId = cf.fieldDefId;
          return {
            fieldDefId: defId,
            value: results[`${testId}_CF_${defId}`] || "",
          };
        }) || [];

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
    },
    onError: () => toast.error("Operation failed"),
  });

  if (isLoading)
    return (
      <div className="h-screen bg-muted/30 flex items-center justify-center">
        <Skeleton className="w-[800px] h-[600px]" />
      </div>
    );
  if (!patient)
    return <div className="p-10 text-center">Patient not found</div>;

  return (
    <div className="min-h-screen bg-slate-100 pb-20">
      {/* HEADER */}
      <div className="bg-white border-b px-6 py-3 sticky top-0 z-10 shadow-sm flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/workspace')}>
            <ArrowLeft className="h-5 w-5 text-slate-500" />
          </Button>
          <div>
            <h1 className="text-lg font-bold text-slate-900 leading-none">{patient.name}</h1>
            <div className="flex gap-3 text-[11px] text-slate-500 mt-1 font-medium uppercase tracking-wider">
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" /> {patient.age} {patient.ageUnit}/
                {patient.gender}
              </span>
              <span className="flex items-center gap-1">
                <FlaskConical className="h-3 w-3" /> PID: {patient.patientId}
              </span>
            </div>
          </div>
        </div>
        
        {/* Helper Badge for shortcuts */}
        <div className="flex items-center gap-4 text-xs font-medium text-slate-500">
          <span className="flex items-center gap-1.5 bg-slate-100 px-2 py-1 rounded-md border">
             <Keyboard className="h-3.5 w-3.5" /> <b>Enter</b> to next field
          </span>
          <span className="flex items-center gap-1.5 bg-slate-100 px-2 py-1 rounded-md border">
             <b>ESC</b> to close
          </span>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto p-4 space-y-4">
        <Accordion
          type="multiple"
          defaultValue={patient.tests.map((t: any) => t.id)}
          className="space-y-4">
          {patient.tests.map((test: any) => {
            const isLocked = test.status === "APPROVED";
            const isReviewReady = test.status === "COMPLETED";
            const parametersToRender = getTestParameters(test);

            return (
              <AccordionItem
                key={test.id}
                value={test.id}
                className="bg-white border rounded-md shadow-sm px-0 overflow-hidden">
                
                {/* TIGHTER ACCORDION TRIGGER */}
                <AccordionTrigger
                  className={`px-4 py-3 hover:no-underline ${isLocked ? "bg-emerald-50/50" : "hover:bg-slate-50"}`}>
                  <div className="flex items-center gap-3 w-full">
                    <div
                      className={`w-2 h-2 rounded-full ${isLocked ? "bg-emerald-600" : isReviewReady ? "bg-blue-600" : "bg-amber-500"}`}
                    />
                    <div className="text-left flex-1">
                      <h3 className="text-sm font-bold text-slate-900 leading-none">
                        {test.testName}
                      </h3>
                    </div>
                    <div className="mr-2">
                      {isLocked ? (
                        <Badge className="bg-emerald-600 hover:bg-emerald-700 text-[10px] h-5">
                          <ShieldCheck className="w-3 h-3 mr-1" /> Approved
                        </Badge>
                      ) : isReviewReady ? (
                        <Badge className="bg-blue-600 hover:bg-blue-700 text-[10px] h-5">
                          Review Ready
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-amber-700 border-amber-200 text-[10px] h-5 bg-amber-50">
                          Data Entry
                        </Badge>
                      )}
                    </div>
                  </div>
                </AccordionTrigger>

                <AccordionContent className="px-0 pb-0">
                  <div className="bg-slate-50 px-4 py-2 border-y border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Label className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1">
                        <Clock className="h-3 w-3" /> Collected:
                      </Label>
                      <Input
                        type="datetime-local"
                        className="h-7 w-[180px] bg-white text-xs border-slate-200"
                        value={results[`${test.id}_RECEIVED`] || ""}
                        onChange={(e) =>
                          setResults({ ...results, [`${test.id}_RECEIVED`]: e.target.value })
                        }
                        disabled={isLocked}
                      />
                    </div>
                  </div>

                  {/* HIGH DENSITY SPREADSHEET TABLE */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200 text-[11px] uppercase tracking-wider">
                        <tr>
                          <th className="px-4 py-2 w-[35%]">Parameter</th>
                          <th className="px-4 py-2 w-[25%]">Result</th>
                          <th className="px-4 py-2 w-[10%]">Unit</th>
                          <th className="px-4 py-2 w-[20%]">Ref. Range</th>
                          <th className="px-4 py-2 w-[10%] text-center">Flag</th>
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
                              className="hover:bg-slate-50 transition-colors focus-within:bg-blue-50/50">
                              
                              <td className="px-4 py-2 font-medium text-slate-800 text-[13px] align-middle">
                                {pName}
                              </td>

                              <td className="px-4 py-1.5 align-middle">
                                {/* ✅ ADDED 'result-data-input' CLASS & KEYDOWN EVENT */}
                                <Input
                                  className={`result-data-input h-8 font-mono font-bold text-[13px] border-slate-300 focus-visible:ring-blue-500 focus-visible:border-blue-500 ${
                                    check.status !== "NORMAL" ? "bg-red-50 text-red-900 border-red-300 focus-visible:ring-red-500" : ""
                                  }`}
                                  value={currentVal}
                                  onKeyDown={handleInputKeyDown}
                                  onChange={(e) =>
                                    setResults({
                                      ...results,
                                      [key]: e.target.value,
                                    })
                                  }
                                  disabled={isLocked}
                                  placeholder="Enter value"
                                />
                              </td>

                              <td className="px-4 py-2 text-slate-500 text-[12px] align-middle">
                                {param.unit || "-"}
                              </td>

                              <td className="px-4 py-2 text-slate-500 text-[11px] align-middle leading-tight">
                                {range ? (
                                  range.textValue ? (
                                    <div className="whitespace-pre-wrap font-mono">{range.textValue}</div>
                                  ) : (
                                    <span>
                                      {range.customLabel && (
                                        <span className="font-bold text-slate-700 mr-1">{range.customLabel}:</span>
                                      )}
                                      {range.lowValue} - {range.highValue}
                                    </span>
                                  )
                                ) : (
                                  "-"
                                )}
                              </td>

                              <td className="px-4 py-2 align-middle text-center">
                                {check.status !== "NORMAL" && (
                                  <div className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-sm ${check.status.includes('CRITICAL') ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
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

                  {/* CUSTOM FIELDS (High Density) */}
                  {test.testTemplate?.customFields?.length > 0 && (
                      <div className="bg-slate-50 p-4 border-t border-slate-200">
                        <h4 className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1.5 mb-3">
                          <FileText className="h-3 w-3" /> Additional Info
                        </h4>
                        <div className="grid grid-cols-2 gap-4">
                          {test.testTemplate.customFields.map((cf: any) => {
                            const def = cf.fieldDef;
                            const key = `${test.id}_CF_${def.id}`;
                            const val = results[key] || "";
                            return (
                              <div key={def.id} className="text-sm">
                                {/* Wrap CustomFieldInput to intercept enter key if it contains inputs */}
                                <div onKeyDown={(e) => {
                                  if(e.key === 'Enter') handleInputKeyDown(e as any);
                                }}>
                                  <CustomFieldInput
                                    field={def}
                                    value={val}
                                    onChange={(newValue) => !isLocked && setResults((prev) => ({ ...prev, [key]: newValue }))}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                  {/* NOTES & SIGNATURES */}
                  <div className="grid grid-cols-2 gap-0 border-t border-slate-200 bg-slate-50 divide-x divide-slate-200">
                    <div className="p-4 space-y-4">
                      <div>
                        <Label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase">
                          <Info className="h-3 w-3" /> Lab Notes
                        </Label>
                        <Textarea
                          className="bg-white min-h-[50px] text-xs resize-none border-slate-200 focus-visible:ring-blue-500"
                          value={results[`${test.id}_NOTES`] || ""}
                          onChange={(e) => setResults({ ...results, [`${test.id}_NOTES`]: e.target.value })}
                          disabled={isLocked}
                        />
                      </div>
                      <div>
                         <Label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase">
                           <User className="h-3 w-3" /> Checked By
                         </Label>
                         <Select
                            disabled={isLocked}
                            value={results[`${test.id}_CHECKED_BY`] || ""}
                            onValueChange={(val) => setResults({...results, [`${test.id}_CHECKED_BY`]: val})}
                         >
                            <SelectTrigger className="bg-white h-8 text-xs border-slate-200">
                              <SelectValue placeholder="Select Technician..." />
                            </SelectTrigger>
                            <SelectContent>
                               {staffList.map((staff: any) => (
                                  <SelectItem key={staff.id} value={staff.id} className="text-xs">{staff.name}</SelectItem>
                               ))}
                            </SelectContent>
                         </Select>
                      </div>
                    </div>

                    <div className="p-4 space-y-4">
                      <div>
                        <Label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase">
                          <Activity className="h-3 w-3" /> Impression
                        </Label>
                        <Textarea
                          className="bg-white min-h-[50px] text-xs font-medium resize-none border-slate-200 focus-visible:ring-blue-500"
                          value={results[`${test.id}_IMPRESSION`] || ""}
                          onChange={(e) => setResults({ ...results, [`${test.id}_IMPRESSION`]: e.target.value })}
                          disabled={isLocked}
                        />
                      </div>
                      <div>
                         <Label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase">
                           <ShieldCheck className="h-3 w-3" /> Approved By
                         </Label>
                         <Select
                            disabled={isLocked}
                            value={results[`${test.id}_APPROVED_BY`] || ""}
                            onValueChange={(val) => setResults({...results, [`${test.id}_APPROVED_BY`]: val})}
                         >
                            <SelectTrigger className="bg-white h-8 text-xs border-slate-200">
                              <SelectValue placeholder="Select Doctor/Pathologist..." />
                            </SelectTrigger>
                            <SelectContent>
                               {staffList.map((staff: any) => (
                                  <SelectItem key={staff.id} value={staff.id} className="text-xs">{staff.name}</SelectItem>
                               ))}
                            </SelectContent>
                         </Select>
                      </div>
                    </div>
                  </div>

                  {/* ACTION FOOTER */}
                  <div className="bg-white p-3 border-t border-slate-200 flex justify-end gap-2 items-center">
                    {isLocked ? (
                      <>
                        <p className="text-[11px] text-emerald-600 uppercase font-bold mr-auto flex items-center gap-1.5">
                          <ShieldCheck className="h-4 w-4" /> Finalized & Locked
                        </p>
                        <Button 
                           variant="outline" 
                           size="sm"
                           className="h-8 text-xs text-amber-700 hover:text-amber-800 hover:bg-amber-50 border-amber-200"
                           onClick={() => actionMutation.mutate({ testId: test.id, action: "UNLOCK" })}
                           disabled={actionMutation.isPending}
                        >
                          <Unlock className="h-3.5 w-3.5 mr-1.5" /> Unlock
                        </Button>
                        <Link href={`/workspace/reports/print/${patient.id}`} target="_blank">
                          <Button size="sm" className="h-8 text-xs bg-slate-900 hover:bg-slate-800">
                            <Printer className="h-3.5 w-3.5 mr-1.5" /> Print Report
                          </Button>
                        </Link>
                      </>
                    ) : (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs"
                          onClick={() => actionMutation.mutate({ testId: test.id, action: "SAVE_DRAFT" })}
                          disabled={actionMutation.isPending}>
                          <Save className="h-3.5 w-3.5 mr-1.5" /> Save Draft
                        </Button>
                        {isReviewReady ? (
                          <Button
                            size="sm"
                            className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700"
                            onClick={() => actionMutation.mutate({ testId: test.id, action: "APPROVE" })}
                            disabled={actionMutation.isPending}>
                            <ShieldCheck className="h-3.5 w-3.5 mr-1.5" /> Approve & Sign
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            className="h-8 text-xs bg-blue-600 hover:bg-blue-700"
                            onClick={() => actionMutation.mutate({ testId: test.id, action: "SUBMIT_FOR_REVIEW" })}
                            disabled={actionMutation.isPending}>
                            Submit <Send className="h-3.5 w-3.5 ml-1.5" />
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