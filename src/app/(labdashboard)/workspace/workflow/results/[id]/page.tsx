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
  Ban,
  FileText,
  Clock,
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

// ✅ HELPER 2: Unified Parameter Generator (THE FIX)
// This logic ensures that even "Single Parameter" tests show input fields.
const getTestParameters = (test: any) => {
  const list: any[] = [];

  // 1. Try fetching from the Official Template (Standard Case)
  const templateParams = test.testTemplate?.parameters || [];
  templateParams.forEach((tp: any) => {
    list.push({
      name: tp.parameter.name,
      ranges: tp.parameter.referenceRanges || [],
      unit: tp.parameter.unit,
      source: "template",
    });
  });

  // 2. If existing results exist (e.g. previously saved data), include them
  const existingResults = test.results || [];
  existingResults.forEach((res: any) => {
    if (!list.find((item) => item.name === res.parameterName)) {
      list.push({
        name: res.parameterName,
        ranges: [], // Ranges might need backend hydration if missing here
        unit: res.unit,
        source: "result",
      });
    }
  });

  // 3. FALLBACK (Critical): If no template & no results, use Test Name as Parameter
  // This fixes the "Single Parameter" issue.
  if (list.length === 0) {
    list.push({
      name: test.testName, // e.g., "Hemoglobin"
      ranges: [], // Backend will fill this snapshot on save
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

  const { data: patient, isLoading } = useQuery({
    queryKey: ["worksheet", patientId],
    queryFn: async () => {
      const res = await fetch(`/api/workspace/workflow/results/${patientId}`);
      if (!res.ok) throw new Error("Failed to load worksheet");
      return res.json();
    },
    staleTime: 0,
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
        }
      });
      setResults(initial);
    }
  }, [patient]);

  const actionMutation = useMutation({
    mutationFn: async ({
      testId,
      action,
    }: {
      testId: string;
      action: string;
    }) => {
      const test = patient.tests.find((t: any) => t.id === testId);

      // ✅ FIX: Use the robust helper for Saving too
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
        }),
      });

      if (!res.ok) throw new Error("Action failed");
      return res.json();
    },
    onSuccess: (_, variables) => {
      const msg =
        variables.action === "APPROVE"
          ? "Approved & Signed"
          : "Saved Successfully";
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
    <div className="min-h-screen bg-muted/30 pb-20">
      <div className="bg-card border-b px-6 py-4 sticky top-0 z-10 shadow-sm flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5 text-muted-foreground" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-foreground">{patient.name}</h1>
            <div className="flex gap-3 text-xs text-muted-foreground mt-1">
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
        <Badge
          variant="outline"
          className="bg-primary/10 text-primary border-primary/20 px-3 py-1">
          Clinical Worksheet
        </Badge>
      </div>

      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <Accordion
          type="multiple"
          defaultValue={patient.tests.map((t: any) => t.id)}
          className="space-y-4">
          {patient.tests.map((test: any) => {
            const isLocked = test.status === "APPROVED";
            const isReviewReady = test.status === "COMPLETED";

            // ✅ FIX: Use helper to get list
            const parametersToRender = getTestParameters(test);

            return (
              <AccordionItem
                key={test.id}
                value={test.id}
                className="bg-card border rounded-lg shadow-sm px-0 overflow-hidden">
                <AccordionTrigger
                  className={`px-6 py-4 hover:no-underline ${isLocked ? "bg-green-50/50" : "hover:bg-muted/30"}`}>
                  <div className="flex items-center gap-4 w-full">
                    <div
                      className={`w-2 h-2 rounded-full ${isLocked ? "bg-green-600" : isReviewReady ? "bg-primary/100" : "bg-orange-500"}`}
                    />
                    <div className="text-left flex-1">
                      <h3 className="font-bold text-slate-800">
                        {test.testName}
                      </h3>
                      <p className="text-xs text-muted-foreground font-mono">
                        {test.testCode}
                      </p>
                    </div>
                    <div className="mr-4">
                      {isLocked ? (
                        <Badge className="bg-green-600 hover:bg-green-700">
                          <ShieldCheck className="w-3 h-3 mr-1" /> Approved
                        </Badge>
                      ) : isReviewReady ? (
                        <Badge className="bg-primary hover:bg-blue-700">
                          Review Ready
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-orange-600 border-orange-200">
                          Data Entry
                        </Badge>
                      )}
                    </div>
                  </div>
                </AccordionTrigger>

                <AccordionContent className="px-0 pb-0">
                  <Separator />

                  <div className="bg-slate-50/50 p-4 border-b border-slate-100 flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" /> Sample Received At:
                      </Label>
                      <Input
                        type="datetime-local"
                        className="h-8 w-[200px] bg-card text-xs"
                        value={results[`${test.id}_RECEIVED`] || ""}
                        onChange={(e) =>
                          setResults({
                            ...results,
                            [`${test.id}_RECEIVED`]: e.target.value,
                          })
                        }
                        disabled={isLocked}
                      />
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-muted/30 text-muted-foreground font-medium border-b">
                        <tr>
                          <th className="px-6 py-3 w-[30%]">Parameter</th>
                          <th className="px-6 py-3 w-[25%]">Ref. Range</th>
                          <th className="px-6 py-3 w-[20%]">Result</th>
                          <th className="px-6 py-3 w-[10%]">Unit</th>
                          <th className="px-6 py-3 w-[15%]">Flag</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {/* ✅ FIX: Map over the robust list instead of testTemplate only */}
                        {parametersToRender.map((param: any) => {
                          const pName = param.name;
                          const range = param.ranges?.[0];
                          const key = `${test.id}_${pName}`;
                          const currentVal = results[key] || "";
                          const check = checkRange(currentVal, param.ranges);

                          return (
                            <tr
                              key={pName}
                              className="hover:bg-muted/50/50 align-top">
                              <td className="px-6 py-3 font-medium text-foreground/80 pt-4">
                                {pName}
                              </td>

                              <td className="px-6 py-3 text-muted-foreground text-xs pt-4">
                                {range ? (
                                  range.textValue ? (
                                    <div className="whitespace-pre-wrap font-mono text-[10px] leading-tight text-muted-foreground">
                                      {range.textValue}
                                    </div>
                                  ) : (
                                    <span>
                                      {range.customLabel ? (
                                        <span className="font-bold text-primary block mb-1">
                                          {range.customLabel}:
                                        </span>
                                      ) : null}
                                      {range.lowValue} - {range.highValue}
                                    </span>
                                  )
                                ) : (
                                  "-"
                                )}
                              </td>

                              <td className="px-6 py-3 pt-3">
                                <Input
                                  className={`h-8 font-mono font-bold ${check.status !== "NORMAL" ? "bg-red-50 text-red-900 border-red-300" : ""}`}
                                  value={currentVal}
                                  onChange={(e) =>
                                    setResults({
                                      ...results,
                                      [key]: e.target.value,
                                    })
                                  }
                                  disabled={isLocked}
                                />
                              </td>
                              <td className="px-6 py-3 text-muted-foreground pt-4">
                                {param.unit || "-"}
                              </td>
                              <td className="px-6 py-3 pt-4">
                                {check.status !== "NORMAL" && (
                                  <div
                                    className={`flex items-center gap-1.5 text-xs font-bold ${check.color}`}>
                                    <AlertTriangle className="h-3 w-3" />{" "}
                                    {check.status}
                                  </div>
                                )}
                                {check.status === "NORMAL" && currentVal && (
                                  <div className="flex items-center gap-1.5 text-xs font-bold text-green-600">
                                    <CheckCircle className="h-3 w-3" /> OK
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Custom Fields Section */}
                  {test.testTemplate?.customFields &&
                    test.testTemplate.customFields.length > 0 && (
                      <div className="bg-slate-50/80 p-6 border-t border-b border-border">
                        <h4 className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-2 mb-4">
                          <FileText className="h-3 w-3" /> Additional
                          Information
                        </h4>
                        <div className="grid grid-cols-1 gap-6">
                          {test.testTemplate.customFields.map((cf: any) => {
                            const def = cf.fieldDef;
                            const key = `${test.id}_CF_${def.id}`;
                            const val = results[key] || "";

                            return (
                              <CustomFieldInput
                                key={def.id}
                                field={def}
                                value={val}
                                onChange={(newValue) =>
                                  !isLocked &&
                                  setResults((prev) => ({
                                    ...prev,
                                    [key]: newValue,
                                  }))
                                }
                              />
                            );
                          })}
                        </div>
                      </div>
                    )}

                  <div className="grid grid-cols-2 gap-6 p-6 bg-slate-50/50 border-t border-border">
                    <div>
                      <Label className="mb-2 flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase">
                        <Info className="h-3 w-3" /> Lab Notes
                      </Label>
                      <Textarea
                        className="bg-card min-h-[80px] text-xs resize-none"
                        value={results[`${test.id}_NOTES`] || ""}
                        onChange={(e) =>
                          setResults({
                            ...results,
                            [`${test.id}_NOTES`]: e.target.value,
                          })
                        }
                        disabled={isLocked}
                      />
                    </div>
                    <div>
                      <Label className="mb-2 flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase">
                        <Activity className="h-3 w-3" /> Impression
                      </Label>
                      <Textarea
                        className="bg-card min-h-[80px] text-xs font-medium resize-none"
                        value={results[`${test.id}_IMPRESSION`] || ""}
                        onChange={(e) =>
                          setResults({
                            ...results,
                            [`${test.id}_IMPRESSION`]: e.target.value,
                          })
                        }
                        disabled={isLocked}
                      />
                    </div>
                  </div>

                  <div className="bg-card p-4 border-t flex justify-end gap-3 items-center">
                    {isLocked ? (
                      <>
                        <p className="text-xs text-green-600 font-bold mr-auto flex items-center gap-2">
                          <ShieldCheck className="h-4 w-4" /> Signed by{" "}
                          {test.approvedBy}
                        </p>
                        <Link
                          href={`/workspace/reports/print/${patient.id}`}
                          target="_blank">
                          <Button className="bg-slate-900 hover:bg-slate-800">
                            <Printer className="h-4 w-4 mr-2" /> Print Final
                            Report
                          </Button>
                        </Link>
                      </>
                    ) : (
                      <>
                        <Button
                          variant="outline"
                          onClick={() =>
                            actionMutation.mutate({
                              testId: test.id,
                              action: "SAVE_DRAFT",
                            })
                          }
                          disabled={actionMutation.isPending}>
                          <Save className="h-4 w-4 mr-2" /> Save Draft
                        </Button>
                        {isReviewReady ? (
                          <Button
                            className="bg-green-600 hover:bg-green-700 shadow-sm"
                            onClick={() =>
                              actionMutation.mutate({
                                testId: test.id,
                                action: "APPROVE",
                              })
                            }
                            disabled={actionMutation.isPending}>
                            <ShieldCheck className="h-4 w-4 mr-2" /> Approve &
                            Sign
                          </Button>
                        ) : (
                          <Button
                            className="bg-primary hover:bg-blue-700"
                            onClick={() =>
                              actionMutation.mutate({
                                testId: test.id,
                                action: "SUBMIT_FOR_REVIEW",
                              })
                            }
                            disabled={actionMutation.isPending}>
                            Submit for Review <Send className="h-4 w-4 ml-2" />
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
