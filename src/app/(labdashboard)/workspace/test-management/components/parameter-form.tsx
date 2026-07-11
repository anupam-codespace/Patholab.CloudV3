"use client";

import { useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  createParameter,
  updateParameter,
} from "@/actions/parameter-management";
import { getContainerTypes } from "@/actions/lims-management";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  Trash2,
  Save,
  Loader2,
  AlertCircle,
  FileText,
  Beaker,
  Globe,
  BugPlay,
} from "lucide-react";
import toast from "react-hot-toast";
import { useQuery } from "@tanstack/react-query";

// --- TYPES & SCHEMA ---
enum ParameterInputType {
  NUMBER = "NUMBER",
  TEXT = "TEXT",
  LONG_TEXT = "LONG_TEXT",
  DROPDOWN = "DROPDOWN",
  HEADING = "HEADING",
}

// Custom parser to handle empty number inputs safely
const optionalNumber = z
  .union([z.coerce.number(), z.literal("")])
  .transform((e) => (e === "" || Number.isNaN(e) ? null : e));

const parameterSchema = z.object({
  name: z.string().min(1, "Parameter Name is required"),
  code: z.string().min(1, "Short code is required"),
  containerTypeId: z.string().optional(),
  inputType: z.nativeEnum(ParameterInputType),
  unit: z.string().optional(),

  // Update the price field in your parameterSchema
price: z.union([z.string(), z.number()])
  .transform((val) => Number(val))
  .pipe(z.number().min(0, "Cannot be negative")),
    
  //decimals: z.coerce.number().min(0, "Cannot be negative").catch(2),

  // Method and Formula are completely optional
  formula: z.string().optional(),
  method: z.string().optional(),

  reagents: z.array(
    z.object({
      inventoryItemId: z
        .string()
        .min(1, "Inventory item selection is required"),
      quantity: z.coerce.number().min(0.001, "Quantity must be greater than 0"),
    }),
  ),

  ranges: z
    .array(
      z.object({
        gender: z.enum(["MALE", "FEMALE", "BOTH", "CUSTOM"]),
        customLabel: z.string().optional(),
        minAge: z.coerce.number().min(0, "Required"),
        maxAge: z.coerce.number().min(0, "Required"),
        ageUnit: z.enum(["YEAR", "MONTH", "DAY"]),
        lowValue: optionalNumber,
        highValue: optionalNumber,
        criticalLow: optionalNumber,
        criticalHigh: optionalNumber,
        textValue: z.string().optional(),
      }),
    )
    .superRefine((ranges, ctx) => {
      ranges.forEach((range, index) => {
        if (range.gender === "CUSTOM" && !range.customLabel) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Custom label is required",
            path: [index, "customLabel"],
          });
        }
        if (range.minAge > range.maxAge) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Min > Max",
            path: [index, "minAge"],
          });
        }
      });
    }),
});

type ParameterFormData = z.infer<typeof parameterSchema>;

// --- API FETCHERS ---
const fetchInventoryItems = async () => {
  const res = await fetch("/api/workspace/inventory/items");
  if (!res.ok) throw new Error("Failed to fetch inventory");
  return res.json();
};

const defaultRange = {
  gender: "BOTH" as const,
  minAge: 0,
  maxAge: 100,
  ageUnit: "YEAR" as const,
  lowValue: "",
  highValue: "",
  criticalLow: "",
  criticalHigh: "",
  textValue: "",
  customLabel: "",
};

export default function ParameterForm({
  onSuccess,
  initialData,
}: {
  onSuccess: () => void;
  initialData?: any;
}) {
  const { data: containers } = useQuery({
    queryKey: ["containers"],
    queryFn: async () => await getContainerTypes(),
  });

  const { data: inventoryItems } = useQuery({
    queryKey: ["inventoryItems"],
    queryFn: fetchInventoryItems,
  });

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<ParameterFormData>({
    resolver: zodResolver(parameterSchema),
    defaultValues: {
      name: "",
      code: "",
      unit: "",
      inputType: ParameterInputType.NUMBER,
      price: 0,
      decimals: 2,
      formula: "",
      method: "",
      containerTypeId: "",
      reagents: [],
      ranges: [defaultRange],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "ranges" });
  const {
    fields: reagentFields,
    append: appendReagent,
    remove: removeReagent,
  } = useFieldArray({ control, name: "reagents" });

  const inputType = watch("inputType");

  // 🔴 DATA HYDRATION: Fetch all ranges and reagents safely
  useEffect(() => {
    if (initialData) {
      // 1. Strip Prisma 'id' from Ranges to prevent React Hook Form crashes
      const formattedRanges =
        initialData.referenceRanges?.length > 0
          ? initialData.referenceRanges.map((r: any) => ({
              gender: r.gender || "BOTH",
              customLabel: r.customLabel || "",
              minAge: Number(r.minAge || 0),
              maxAge: Number(r.maxAge || 100),
              ageUnit: r.ageUnit || "YEAR",
              lowValue: r.lowValue ?? "",
              highValue: r.highValue ?? "",
              criticalLow: r.criticalLow ?? "",
              criticalHigh: r.criticalHigh ?? "",
              textValue: r.textValue || "",
            }))
          : [defaultRange];

      // 2. Strip Prisma 'id' from Reagents and cast Decimals
      const formattedReagents =
        initialData.reagents?.length > 0
          ? initialData.reagents.map((r: any) => ({
              inventoryItemId: r.inventoryItemId,
              quantity: Number(r.quantity || 0),
            }))
          : [];

      // 3. Reset the form strictly with matching Schema fields
      reset({
        name: initialData.name || "",
        code: initialData.code || "",
        unit: initialData.unit || "",
        inputType: initialData.inputType || ParameterInputType.NUMBER,

        // ✅ SAFELY CONVERT TO NUMBER
        price: initialData.price ? Number(initialData.price) : 0,
        decimals: initialData.decimals ? Number(initialData.decimals) : 2,

        // Convert "NA" back to empty strings for a clean editing experience
        method: initialData.method === "NA" ? "" : initialData.method || "",
        formula: initialData.formula === "NA" ? "" : initialData.formula || "",

        containerTypeId: initialData.containerTypeId || "generic",
        reagents: formattedReagents,
        ranges: formattedRanges,
      });
    }
  }, [initialData, reset]);

  const onSubmit = async (data: ParameterFormData) => {
    try {
      // ✅ INTERCEPT: Inject "NA" if method or formula are empty!
      const submitPayload = {
        ...data,
        method: data.method?.trim() ? data.method : "NA",
        formula: data.formula?.trim() ? data.formula : "NA",
      };

      if (initialData && initialData.id) {
        const res = await updateParameter(initialData.id, submitPayload);
        if (res?.error) throw new Error(res.error); // Catch duplicate code error
        toast.success(
          initialData.isGlobal
            ? "Local override created!"
            : "Parameter updated successfully!",
        );
      } else {
        const res = await createParameter(submitPayload);
        if (res?.error) throw new Error(res.error); // Catch duplicate code error
        toast.success("Parameter created successfully!");
      }
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Failed to save parameter.");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* 🔴 DEVELOPER DEBUGGER (Safely stripped of circular 'ref' objects) */}
      {Object.keys(errors).length > 0 && (
        <div className="p-4 bg-slate-900 text-red-400 rounded-lg text-xs font-mono overflow-auto border border-red-900 shadow-inner max-h-48">
          <div className="flex items-center gap-2 mb-2 text-white font-bold pb-2 border-b border-slate-700">
            <BugPlay className="w-4 h-4 text-rose-500" /> Validation Debugger
            (Under the hood)
          </div>
          <pre>
            {JSON.stringify(
              errors,
              (key, value) => (key === "ref" ? undefined : value),
              2,
            )}
          </pre>
        </div>
      )}

      {/* GLOBAL WARNING BANNER */}
      {initialData?.isGlobal && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
          <Globe className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-blue-800 font-semibold text-sm">
              Global Master Parameter
            </h4>
            <p className="text-blue-700 text-xs mt-1 leading-relaxed">
              You are editing a master catalog parameter. If you modify its
              details or reference ranges, a customized local copy will
              automatically be generated specifically for your laboratory to
              protect the master catalog.
            </p>
          </div>
        </div>
      )}

      <Tabs defaultValue="core" className="w-full">
        {/* SMART TABS: Highlight Red on Error */}
        <TabsList className="grid w-full grid-cols-4 bg-slate-100 p-1 rounded-lg">
          <TabsTrigger
            value="core"
            className={
              errors.name || errors.code || errors.price || errors.decimals
                ? "text-red-600 font-bold bg-red-50/50"
                : ""
            }
          >
            Core{" "}
            {(errors.name || errors.code || errors.price || errors.decimals) &&
              "*"}
          </TabsTrigger>
          <TabsTrigger
            value="ranges"
            disabled={inputType !== "NUMBER"}
            className={
              errors.ranges ? "text-red-600 font-bold bg-red-50/50" : ""
            }
          >
            Ranges {errors.ranges && "*"}
          </TabsTrigger>
          <TabsTrigger
            value="formula"
            disabled={inputType !== "NUMBER"}
            className={
              errors.formula ? "text-red-600 font-bold bg-red-50/50" : ""
            }
          >
            Formula {errors.formula && "*"}
          </TabsTrigger>
          <TabsTrigger
            value="reagents"
            className={
              errors.reagents ? "text-red-600 font-bold bg-red-50/50" : ""
            }
          >
            Inventory {errors.reagents && "*"}
          </TabsTrigger>
        </TabsList>

        {/* --- TAB: CORE --- */}
        <TabsContent value="core" className="space-y-5 pt-4">
          <div className="grid grid-cols-2 gap-5">
            <div className="space-y-2">
              <label className="text-sm font-semibold flex items-center gap-1">
                Parameter Name <span className="text-red-500">*</span>
              </label>
              <Input
                {...register("name")}
                placeholder="e.g. Hemoglobin"
                className={errors.name ? "border-red-500 bg-red-50" : ""}
              />
              {errors.name && (
                <span className="text-[10px] font-bold text-red-500">
                  {errors.name.message}
                </span>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold flex items-center gap-1">
                Short Code <span className="text-red-500">*</span>
              </label>
              <Input
                {...register("code")}
                placeholder="e.g. HGB"
                className={errors.code ? "border-red-500 bg-red-50" : ""}
              />
              {errors.code && (
                <span className="text-[10px] font-bold text-red-500">
                  {errors.code.message}
                </span>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Tube / Container</label>
            <Select
              onValueChange={(val) =>
                setValue("containerTypeId", val === "generic" ? "" : val)
              }
              defaultValue={
                getValues("containerTypeId") ||
                initialData?.containerTypeId ||
                "generic"
              }
              key={initialData?.containerTypeId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Tube" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="generic">General Vial</SelectItem>
                {containers &&
                  containers.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} ({c.code})
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-1">
                Input Type <span className="text-red-500">*</span>
              </label>
              <Select
                onValueChange={(val) =>
                  setValue("inputType", val as ParameterInputType)
                }
                value={inputType}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NUMBER">Numeric Result</SelectItem>
                  <SelectItem value="TEXT">Short Text</SelectItem>
                  <SelectItem value="LONG_TEXT">Paragraph</SelectItem>
                  <SelectItem value="DROPDOWN">Dropdown List</SelectItem>
                  <SelectItem value="HEADING">Heading Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Unit</label>
              <Input
                {...register("unit")}
                placeholder="e.g. g/dL"
                disabled={inputType === "HEADING"}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-1">
                Price (₹) <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                step="0.01"
                {...register("price")}
                placeholder="0.00"
                className={errors.price ? "border-red-500 bg-red-50" : ""}
              />
              {errors.price && (
                <span className="text-[10px] font-bold text-red-500">
                  {errors.price.message}
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Method</label>
              <Input
                {...register("method")}
                placeholder="e.g. Photometry (Optional)"
              />
            </div>
            {inputType === "NUMBER" && (
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-1">
                  Decimal Places <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  {...register("decimals")}
                  className={`w-24 ${errors.decimals ? "border-red-500 bg-red-50" : ""}`}
                />
                {errors.decimals && (
                  <span className="text-[10px] font-bold text-red-500 block">
                    {errors.decimals.message}
                  </span>
                )}
              </div>
            )}
          </div>
        </TabsContent>

        {/* --- TAB: REFERENCE RANGES --- */}
        <TabsContent value="ranges" className="space-y-4 pt-4">
          <div className="space-y-6">
            <div className="bg-blue-50 p-3 rounded-md text-xs text-blue-700 flex gap-2">
              <FileText className="w-4 h-4 mt-0.5 shrink-0" />
              <div>
                <strong>Text Reporting:</strong> Paste long text in "Report
                Display Text" to override numbers.
                <br />
                <strong>Custom Conditions:</strong> Select "Custom" in Gender to
                enable the custom label input (e.g. "Child").
              </div>
            </div>

            {fields.map((field, index) => {
              const rangeErrs = errors.ranges?.[index] as any;
              const currentGender = watch(`ranges.${index}.gender`);
              const isCustom = currentGender === "CUSTOM";

              return (
                <Card
                  key={field.id}
                  className={`relative shadow-sm overflow-hidden ${rangeErrs ? "border-red-300 ring-1 ring-red-100" : "border-slate-200"}`}
                >
                  <div
                    className={`absolute top-0 left-0 w-1 h-full ${rangeErrs ? "bg-red-500" : "bg-blue-500"}`}
                  ></div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-2 text-red-500 hover:bg-red-50"
                    onClick={() => remove(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>

                  <CardContent className="p-4 grid gap-5">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5 text-blue-600" />
                        Report Display Text (Ref Range Column)
                      </label>
                      <Textarea
                        {...register(`ranges.${index}.textValue`)}
                        className="min-h-[60px] text-xs font-mono bg-slate-50 border-slate-200 focus:bg-white"
                        placeholder={
                          ">6.5 DIABETIC\n5.7-6.4 PRE DIABETIC\n<5.7 NON DIABETIC"
                        }
                      />
                    </div>

                    <div className="grid grid-cols-12 gap-3 items-end border-b pb-4 border-slate-100">
                      <div className="col-span-3 space-y-1">
                        <label className="text-xs text-slate-500 font-medium flex items-center gap-1">
                          Gender / Condition{" "}
                          <span className="text-red-500">*</span>
                        </label>
                        <Select
                          onValueChange={(v: any) => {
                            setValue(`ranges.${index}.gender`, v);
                            if (v !== "CUSTOM")
                              setValue(`ranges.${index}.customLabel`, "");
                          }}
                          defaultValue={field.gender}
                        >
                          <SelectTrigger className="h-8 text-xs font-medium">
                            <SelectValue placeholder={field.gender} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="MALE">Male</SelectItem>
                            <SelectItem value="FEMALE">Female</SelectItem>
                            <SelectItem value="BOTH">Both</SelectItem>
                            <SelectItem
                              value="CUSTOM"
                              className="font-bold text-blue-600"
                            >
                              Custom
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="col-span-3 space-y-1">
                        <label
                          className={`text-xs font-medium flex items-center gap-1 ${isCustom ? "text-blue-700" : "text-slate-300"}`}
                        >
                          Custom Label{" "}
                          {isCustom && <span className="text-red-500">*</span>}
                        </label>
                        <Input
                          {...register(`ranges.${index}.customLabel`)}
                          disabled={!isCustom}
                          className={`h-8 text-xs transition-colors ${isCustom ? "bg-yellow-50 border-yellow-300 text-slate-900" : "bg-slate-100 border-slate-200 text-slate-400"} ${rangeErrs?.customLabel ? "border-red-500" : ""}`}
                          placeholder={
                            isCustom ? "e.g. High Risk" : "Select Custom first"
                          }
                        />
                        {rangeErrs?.customLabel && (
                          <span className="text-[10px] text-red-600 font-bold block">
                            {rangeErrs.customLabel.message}
                          </span>
                        )}
                      </div>

                      <div className="col-span-2 space-y-1">
                        <label className="text-xs text-slate-500 font-medium flex items-center gap-1">
                          Min Age <span className="text-red-500">*</span>
                        </label>
                        <Input
                          type="number"
                          {...register(`ranges.${index}.minAge`)}
                          className={`h-8 text-xs ${rangeErrs?.minAge ? "border-red-500 bg-red-50" : ""}`}
                        />
                        {rangeErrs?.minAge && (
                          <span className="text-[10px] text-red-600 font-bold block">
                            {rangeErrs.minAge.message}
                          </span>
                        )}
                      </div>

                      <div className="col-span-2 space-y-1">
                        <label className="text-xs text-slate-500 font-medium flex items-center gap-1">
                          Max Age <span className="text-red-500">*</span>
                        </label>
                        <Input
                          type="number"
                          {...register(`ranges.${index}.maxAge`)}
                          className={`h-8 text-xs ${rangeErrs?.maxAge ? "border-red-500 bg-red-50" : ""}`}
                        />
                        {rangeErrs?.maxAge && (
                          <span className="text-[10px] text-red-600 font-bold block">
                            {rangeErrs.maxAge.message}
                          </span>
                        )}
                      </div>

                      <div className="col-span-2 space-y-1">
                        <label className="text-xs text-slate-500 font-medium flex items-center gap-1">
                          Unit <span className="text-red-500">*</span>
                        </label>
                        <Select
                          onValueChange={(v: any) =>
                            setValue(`ranges.${index}.ageUnit`, v)
                          }
                          defaultValue={field.ageUnit}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder={field.ageUnit} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="YEAR">Years</SelectItem>
                            <SelectItem value="MONTH">Months</SelectItem>
                            <SelectItem value="DAY">Days</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700">
                          Low (Num)
                        </label>
                        <Input
                          type="number"
                          step="0.01"
                          {...register(`ranges.${index}.lowValue`)}
                          className={`h-8 text-xs ${rangeErrs?.lowValue ? "border-red-500 bg-red-50" : "bg-white"}`}
                          placeholder="0"
                        />
                        {rangeErrs?.lowValue && (
                          <span className="text-[10px] text-red-600 font-bold block">
                            {rangeErrs.lowValue.message}
                          </span>
                        )}
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700">
                          High (Num)
                        </label>
                        <Input
                          type="number"
                          step="0.01"
                          {...register(`ranges.${index}.highValue`)}
                          className={`h-8 text-xs ${rangeErrs?.highValue ? "border-red-500 bg-red-50" : "bg-white"}`}
                          placeholder="0"
                        />
                        {rangeErrs?.highValue && (
                          <span className="text-[10px] text-red-600 font-bold block">
                            {rangeErrs.highValue.message}
                          </span>
                        )}
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-red-600">
                          Panic Low
                        </label>
                        <Input
                          type="number"
                          step="0.01"
                          {...register(`ranges.${index}.criticalLow`)}
                          className="h-8 text-xs bg-red-50 border-red-100"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-red-600">
                          Panic High
                        </label>
                        <Input
                          type="number"
                          step="0.01"
                          {...register(`ranges.${index}.criticalHigh`)}
                          className="h-8 text-xs bg-red-50 border-red-100"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full border-dashed"
              onClick={() => append(defaultRange)}
            >
              <Plus className="mr-2 h-4 w-4" /> Add Range Condition
            </Button>
          </div>
        </TabsContent>

        {/* --- TAB: FORMULA --- */}
        <TabsContent value="formula" className="pt-4 space-y-4">
          <div className="p-4 bg-blue-50 text-blue-800 rounded-md text-sm">
            <strong>How to use:</strong> Use parameter codes in calculations.
            Example: <code>(TP - ALB)</code>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Calculation Formula</label>
            <Input
              {...register("formula")}
              placeholder="e.g. (TP - ALB) (Optional)"
            />
          </div>
        </TabsContent>

        {/* --- TAB: INVENTORY / REAGENTS --- */}
        <TabsContent value="reagents" className="pt-4 space-y-4">
          <div className="p-4 bg-emerald-50 text-emerald-800 rounded-md text-sm mb-4">
            <strong>Auto-Consumption:</strong> Items linked here are
            automatically deducted from active inventory when this parameter is
            completed.
          </div>

          <div className="space-y-3">
            {reagentFields.map((field, index) => {
              const selectedItemId = watch(`reagents.${index}.inventoryItemId`);
              const selectedItem = inventoryItems?.find(
                (i: any) => i.id === selectedItemId,
              );
              const unitLabel = selectedItem ? selectedItem.usageUnit : "units";
              const reagentErrors = errors.reagents?.[index] as any;

              return (
                <div
                  key={field.id}
                  className={`flex items-start gap-3 bg-white p-3 rounded-lg border shadow-sm relative group ${reagentErrors ? "border-red-300 bg-red-50/30" : "border-slate-200"}`}
                >
                  <div className="flex-1 space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                      Inventory Catalog Item{" "}
                      <span className="text-red-500">*</span>
                    </label>
                    <Select
                      onValueChange={(v) =>
                        setValue(`reagents.${index}.inventoryItemId`, v)
                      }
                      defaultValue={(field as any).inventoryItemId}
                    >
                      <SelectTrigger
                        className={`bg-slate-50 ${reagentErrors?.inventoryItemId ? "border-red-500 ring-1 ring-red-200" : ""}`}
                      >
                        <SelectValue placeholder="Search or select an item..." />
                      </SelectTrigger>
                      <SelectContent>
                        {inventoryItems?.map((item: any) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.name}{" "}
                            <span className="text-slate-400">
                              ({item.category || "No Category"})
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {reagentErrors?.inventoryItemId && (
                      <span className="text-[10px] text-red-600 font-bold block">
                        {reagentErrors.inventoryItemId.message}
                      </span>
                    )}
                  </div>

                  <div className="w-1/3 space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                      Quantity per Test <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Input
                        type="number"
                        step="0.001"
                        min="0"
                        {...register(`reagents.${index}.quantity`)}
                        className={`pr-16 ${reagentErrors?.quantity ? "border-red-500 bg-red-50" : ""}`}
                        placeholder="0.0"
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-xs text-slate-400 font-medium">
                        {unitLabel}
                      </div>
                    </div>
                    {reagentErrors?.quantity && (
                      <span className="text-[10px] text-red-600 font-bold block">
                        {reagentErrors.quantity.message}
                      </span>
                    )}
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="mt-6 text-slate-400 hover:text-red-500 hover:bg-red-50"
                    onClick={() => removeReagent(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full border-dashed text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 border-emerald-200"
            onClick={() => appendReagent({ inventoryItemId: "", quantity: 0 })}
          >
            <Beaker className="mr-2 h-4 w-4" /> Link Inventory Item
          </Button>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onSuccess}>
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {isSubmitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          {initialData?.isGlobal
            ? "Save Local Override"
            : initialData
              ? "Update Parameter"
              : "Save Parameter"}
        </Button>
      </div>

      {/* Global Error Summary */}
      {Object.keys(errors).length > 0 && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-red-600 text-sm flex items-center gap-2 animate-pulse">
          <AlertCircle className="w-5 h-5" />
          <strong>Validation Error:</strong> Please fill in all required fields
          marked with <span className="text-red-500 font-bold">*</span>. Check
          the tabs above!
        </div>
      )}
    </form>
  );
}
