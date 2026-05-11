"use client";

import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQuery } from "@tanstack/react-query";

import { createTest } from "@/actions/test-catalog"; // Kept for creation
import {
  getDepartments,
  getSampleTypes,
  getTestHeadings,
  getContainerTypes,
} from "@/actions/lims-management";
import { getParameters } from "@/actions/parameter-management";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import {
  Trash2,
  GripVertical,
  Save,
  Loader2,
  Search,
  AlertCircle,
  Beaker,
  Globe,
} from "lucide-react"; // ✅ ADDED Globe
import toast from "react-hot-toast";
import CustomFieldSelector from "./custom-field-selector";

// --- 1. TYPES & ZOD SCHEMA ---
type Option = { id: string; name: string; code?: string };

const testSchema = z.object({
  name: z.string().min(1, "Test Name is required"),
  code: z.string().min(1, "Short code is required"),
  printName: z.string().optional(),
  departmentId: z.string().min(1, "Department is required"),
  sampleTypeId: z.string().min(1, "Sample Type is required"),
  containerTypeId: z.string().optional(),
  price: z.coerce.number().min(0, "Price cannot be negative").default(0),
  b2bPrice: z.coerce.number().min(0).default(0),
  cost: z.coerce.number().min(0).default(0),
  tat: z.string().min(1, "Turnaround Time is required"),
  method: z.string().min(1, "Methodology is required"),
  isActive: z.boolean().default(true),
  components: z
    .array(
      z.object({
        parameterId: z.string(),
        headingId: z.string().optional(),
        name: z.string(),
      }),
    )
    .min(1, "Please add at least one parameter to this test."),
});

type TestFormData = z.infer<typeof testSchema>;

// --- 2. MAIN COMPONENT ---
interface TestFormProps {
  onSuccess: (result?: any) => void; // ✅ UPDATED: Accepts result payload
  initialData?: any;
}

export default function TestForm({ onSuccess, initialData }: TestFormProps) {
  const [departments, setDepartments] = useState<Option[]>([]);
  const [samples, setSamples] = useState<Option[]>([]);
  const [headings, setHeadings] = useState<Option[]>([]);
  const [paramLibrary, setParamLibrary] = useState<any[]>([]);
  const [paramSearch, setParamSearch] = useState("");
  const [customFieldIds, setCustomFieldIds] = useState<string[]>([]);

  // Standardized React Query for Containers
  const { data: containers } = useQuery({
    queryKey: ["containers"],
    queryFn: async () => await getContainerTypes(),
    staleTime: 1000 * 60 * 5,
  });

  // Load Reference Data
  useEffect(() => {
    Promise.all([
      getDepartments(),
      getSampleTypes(),
      getTestHeadings(),
      getParameters(),
    ]).then(([d, s, h, p]) => {
      setDepartments(d);
      setSamples(s);
      setHeadings(h);
      setParamLibrary(p);
    });
  }, []);

  // 3. Form Setup with Zod Resolver
  const {
    register,
    control,
    handleSubmit,
    setValue,
    reset,
    watch,
    getValues,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<TestFormData>({
    resolver: zodResolver(testSchema),
    defaultValues: {
      name: "",
      code: "",
      printName: "",
      departmentId: "",
      sampleTypeId: "",
      containerTypeId: "",
      price: 0,
      b2bPrice: 0,
      cost: 0,
      tat: "",
      method: "",
      isActive: true,
      components: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "components",
  });
  const watchedComponents = watch("components");

  // 4. Data Hydration
  useEffect(() => {
    if (initialData) {
      const formattedComponents =
        initialData.components?.map((c: any) => ({
          parameterId: c.parameterId || c.parameter?.id,
          name: c.parameter?.name || "Unknown Parameter",
          headingId: c.headingId || "none",
        })) || [];

      reset({
        name: initialData.name,
        code: initialData.code,
        printName: initialData.printName || "",
        departmentId: initialData.departmentId || initialData.department?.id, // Handle nested objects
        sampleTypeId: initialData.sampleTypeId,
        containerTypeId:
          initialData.containerTypeId || initialData.containerType?.id || "",
        price: Number(initialData.effectivePrice || initialData.price),
        b2bPrice: Number(
          initialData.effectiveB2BPrice || initialData.b2bPrice || 0,
        ),
        cost: Number(initialData.cost || 0),
        tat: initialData.effectiveTat || initialData.tat || "",
        method: initialData.method || "",
        isActive: initialData.isActive ?? true,
        components: formattedComponents,
      });

      const existingIds =
        initialData.customFields?.map((cf: any) => cf.fieldDefId) || [];
      setCustomFieldIds(existingIds);
    } else {
      reset();
      setCustomFieldIds([]);
    }
  }, [initialData, reset]);

  // Auto-calculate price
  useEffect(() => {
    if (!paramLibrary.length) return;
    const totalParamPrice = watchedComponents.reduce((sum, comp) => {
      const param = paramLibrary.find((p) => p.id === comp.parameterId);
      return sum + (param?.price || 0);
    }, 0);

    if (totalParamPrice > 0 && getValues("price") === 0) {
      setValue("price", totalParamPrice, { shouldValidate: true });
    }
  }, [watchedComponents, paramLibrary, setValue, getValues]);

  // 5. Submit Handler (✅ UPDATED: Uses our new Diff & Fork API)
  const onSubmit = async (data: TestFormData) => {
    try {
      const payload = {
        ...data,
        containerTypeId: data.containerTypeId || undefined,
        components: data.components.map((c, index) => ({
          parameterId: c.parameterId,
          headingId: c.headingId === "none" ? null : c.headingId,
          order: index + 1,
        })),
        customFieldIds: customFieldIds,
        // The formState isDirty lets the backend know if the user actually clicked around
        parametersChanged: isDirty,
      };

      let result = null;

      if (initialData?.id) {
        // Edit Mode -> Send to our Diff & Fork API
        const response = await fetch(
          `/api/workspace/test-catalog/${initialData.id}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          },
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to update test");
        }

        result = await response.json();
      } else {
        // Create Mode -> Standard Server Action
        await createTest(payload);
        toast.success("Test created successfully!");
      }

      onSuccess(result); // Pass the payload up so the table can trigger the "Forked" toast
    } catch (error: any) {
      toast.error(error.message || "Failed to save test");
      console.error(error);
    }
  };

  const addParameter = (paramId: string) => {
    const param = paramLibrary.find((p) => p.id === paramId);
    if (param) {
      append({ parameterId: param.id, name: param.name, headingId: "none" });
      setParamSearch("");
    }
  };

  // LIVE REAGENT AGGREGATION FOR PREVIEW
  const liveReagents = watchedComponents.reduce((acc: any, comp) => {
    const param = paramLibrary.find((p) => p.id === comp.parameterId);
    param?.reagents?.forEach((r: any) => {
      if (!acc[r.inventoryItemId]) {
        acc[r.inventoryItemId] = {
          name: r.inventoryItem.name,
          unit: r.inventoryItem.usageUnit,
          totalQuantity: 0,
        };
      }
      acc[r.inventoryItemId].totalQuantity += r.quantity;
    });
    return acc;
  }, {});
  const liveReagentList = Object.values(liveReagents);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* ✅ ADDED: GLOBAL WARNING BANNER */}
      {initialData?.isGlobal && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
          <Globe className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-blue-800 font-semibold text-sm">
              Global Catalog Test
            </h4>
            <p className="text-blue-700 text-xs mt-1 leading-relaxed">
              You are editing a master catalog test. If you change its pricing,
              a quick override will be applied. If you modify its clinical
              details (parameters, sample type, etc.), a customized local copy
              will automatically be generated specifically for your laboratory
              to protect the master catalog.
            </p>
          </div>
        </div>
      )}

      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-slate-100 p-1 rounded-lg">
          <TabsTrigger
            value="basic"
            className={
              errors.name ||
              errors.code ||
              errors.departmentId ||
              errors.sampleTypeId
                ? "text-red-500"
                : ""
            }>
            Basic Details{" "}
            {(errors.name ||
              errors.code ||
              errors.departmentId ||
              errors.sampleTypeId) &&
              "*"}
          </TabsTrigger>
          <TabsTrigger
            value="parameters"
            className={
              errors.components
                ? "text-red-500"
                : watchedComponents.length === 0
                  ? "text-amber-600"
                  : ""
            }>
            Parameter Mapping {errors.components && "*"}
          </TabsTrigger>
          <TabsTrigger
            value="pricing"
            className={
              errors.price || errors.tat || errors.method ? "text-red-500" : ""
            }>
            Pricing & Ops {(errors.price || errors.tat || errors.method) && "*"}
          </TabsTrigger>
        </TabsList>

        {/* --- TAB: BASIC DETAILS --- */}
        <TabsContent value="basic" className="space-y-6 pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                Test Name <span className="text-red-500">*</span>
              </Label>
              <Input
                {...register("name")}
                placeholder="e.g. Complete Blood Count"
                className={errors.name ? "border-red-500 bg-red-50" : ""}
              />
              {errors.name && (
                <span className="text-xs text-red-500">
                  {errors.name.message}
                </span>
              )}
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                Short Code <span className="text-red-500">*</span>
              </Label>
              <Input
                {...register("code")}
                placeholder="e.g. CBC"
                className={errors.code ? "border-red-500 bg-red-50" : ""}
              />
              {errors.code && (
                <span className="text-xs text-red-500">
                  {errors.code.message}
                </span>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Print Name (on Report)</Label>
            <Input
              {...register("printName")}
              placeholder="Usually same as Test Name"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                Department <span className="text-red-500">*</span>
              </Label>
              <Select
                value={watch("departmentId")}
                onValueChange={(v) =>
                  setValue("departmentId", v, { shouldValidate: true })
                }>
                <SelectTrigger
                  className={
                    errors.departmentId
                      ? "border-red-500 ring-1 ring-red-200"
                      : ""
                  }>
                  <SelectValue placeholder="Select Department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.departmentId && (
                <span className="text-xs text-red-500">
                  {errors.departmentId.message}
                </span>
              )}
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                Sample Type <span className="text-red-500">*</span>
              </Label>
              <Select
                value={watch("sampleTypeId")}
                onValueChange={(v) =>
                  setValue("sampleTypeId", v, { shouldValidate: true })
                }>
                <SelectTrigger
                  className={
                    errors.sampleTypeId
                      ? "border-red-500 ring-1 ring-red-200"
                      : ""
                  }>
                  <SelectValue placeholder="Select Sample" />
                </SelectTrigger>
                <SelectContent>
                  {samples.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.sampleTypeId && (
                <span className="text-xs text-red-500">
                  {errors.sampleTypeId.message}
                </span>
              )}
            </div>

            <div className="space-y-2">
              <Label>Container / Tube</Label>
              <Select
                onValueChange={(val) => setValue("containerTypeId", val)}
                defaultValue={
                  getValues("containerTypeId") ||
                  initialData?.containerTypeId ||
                  initialData?.containerType?.id
                }
                key={
                  initialData?.containerTypeId || initialData?.containerType?.id
                }>
                <SelectTrigger>
                  <SelectValue placeholder="Select Tube" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="generic">General Vial</SelectItem>
                  {Array.isArray(containers) &&
                    containers.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full border border-gray-200"
                            style={{ backgroundColor: c.capColor || "#ccc" }}
                          />
                          <span>
                            {c.name} ({c.code})
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="p-4 bg-slate-50 border rounded-lg mt-4">
            <CustomFieldSelector
              selectedIds={customFieldIds}
              onChange={setCustomFieldIds}
            />
          </div>
        </TabsContent>

        {/* --- TAB: PARAMETER MAPPING --- */}
        <TabsContent value="parameters" className="space-y-4 pt-4">
          <div className="p-4 bg-slate-50 border rounded-lg space-y-3">
            <Label className="text-xs font-semibold uppercase text-muted-foreground">
              Add Parameters
            </Label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search parameter name or code..."
                className="pl-8"
                value={paramSearch}
                onChange={(e) => setParamSearch(e.target.value)}
              />
              {paramSearch && (
                <div className="absolute z-10 w-full bg-white border rounded-md shadow-lg mt-1 max-h-48 overflow-y-auto">
                  {paramLibrary
                    .filter(
                      (p) =>
                        p.name
                          .toLowerCase()
                          .includes(paramSearch.toLowerCase()) ||
                        p.code
                          .toLowerCase()
                          .includes(paramSearch.toLowerCase()),
                    )
                    .slice(0, 10)
                    .map((p) => (
                      <div
                        key={p.id}
                        className="p-2 hover:bg-blue-50 cursor-pointer text-sm flex justify-between"
                        onClick={() => addParameter(p.id)}>
                        <span>{p.name}</span>
                        <span className="text-xs text-muted-foreground font-mono">
                          {p.code}
                        </span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>

          <div
            className={`space-y-2 border rounded-md p-2 ${errors.components ? "border-red-300 bg-red-50" : fields.length === 0 ? "border-amber-200 bg-amber-50" : "border-slate-200"}`}>
            <div className="flex justify-between items-center">
              <div className="text-sm font-medium">
                Selected Components ({fields.length})
              </div>
              {errors.components && (
                <span className="text-xs text-red-600 font-bold flex items-center">
                  <AlertCircle className="w-3 h-3 mr-1" />{" "}
                  {errors.components.message}
                </span>
              )}
              {!errors.components && fields.length === 0 && (
                <span className="text-xs text-amber-600 font-bold flex items-center">
                  <AlertCircle className="w-3 h-3 mr-1" /> No parameters
                  selected
                </span>
              )}
            </div>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className="flex items-center gap-3 bg-white p-2 border rounded shadow-sm group">
                  <GripVertical className="h-4 w-4 text-slate-300 cursor-move" />
                  <div className="flex-1 grid grid-cols-2 gap-4 items-center">
                    <span className="font-medium text-sm">{field.name}</span>
                    <Select
                      value={watch(`components.${index}.headingId`) || "none"}
                      onValueChange={(v) =>
                        setValue(`components.${index}.headingId`, v)
                      }>
                      <SelectTrigger className="h-7 text-xs">
                        <SelectValue placeholder="No Heading" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Heading</SelectItem>
                        {headings.map((h) => (
                          <SelectItem key={h.id} value={h.id}>
                            {h.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => remove(index)}
                    className="h-6 w-6 text-red-400 hover:text-red-600">
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* LIVE REAGENT PREVIEW UI */}
          {liveReagentList.length > 0 && (
            <div className="mt-4 p-4 bg-emerald-50 border border-emerald-100 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Beaker className="w-4 h-4 text-emerald-600" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                  Estimated Reagent Consumption
                </h4>
              </div>
              <div className="flex flex-wrap gap-2">
                {liveReagentList.map((r: any, idx: number) => (
                  <div
                    key={idx}
                    className="bg-white border border-emerald-200 px-3 py-1.5 rounded-md text-sm font-medium text-slate-700 shadow-sm">
                    {r.name}:{" "}
                    <span className="font-bold text-emerald-700">
                      {r.totalQuantity.toFixed(2)} {r.unit}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        {/* --- TAB: PRICING & OPS --- */}
        <TabsContent value="pricing" className="space-y-4 pt-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                Standard Rate (₹) <span className="text-red-500">*</span>
              </Label>
              <Input
                type="number"
                step="0.01"
                {...register("price")}
                className={`font-semibold text-slate-900 ${errors.price ? "border-red-500 bg-red-50" : ""}`}
              />
              {errors.price && (
                <span className="text-xs text-red-500">
                  {errors.price.message}
                </span>
              )}
              <p className="text-[10px] text-muted-foreground">
                Auto-calculated from parameters. You can edit this.
              </p>
            </div>
            <div className="space-y-2">
              <Label>B2B Rate</Label>
              <Input type="number" step="0.01" {...register("b2bPrice")} />
            </div>
            <div className="space-y-2">
              <Label>Lab Cost</Label>
              <Input type="number" step="0.01" {...register("cost")} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                TAT <span className="text-red-500">*</span>
              </Label>
              <Input
                {...register("tat")}
                placeholder="e.g. 4 Hours"
                className={errors.tat ? "border-red-500 bg-red-50" : ""}
              />
              {errors.tat && (
                <span className="text-xs text-red-500">
                  {errors.tat.message}
                </span>
              )}
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                Methodology <span className="text-red-500">*</span>
              </Label>
              <Input
                {...register("method")}
                placeholder="e.g. CLIA"
                className={errors.method ? "border-red-500 bg-red-50" : ""}
              />
              {errors.method && (
                <span className="text-xs text-red-500">
                  {errors.method.message}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2 pt-2">
            <Checkbox
              id="active"
              checked={watch("isActive")}
              onCheckedChange={(v) => setValue("isActive", !!v)}
            />
            <Label htmlFor="active">Active</Label>
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-2 pt-4 border-t mt-4">
        <Button type="button" variant="outline" onClick={() => onSuccess()}>
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="bg-blue-600 hover:bg-blue-700">
          {isSubmitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          {initialData?.isGlobal
            ? "Save Local Override"
            : initialData
              ? "Update Test"
              : "Create Custom Test"}
        </Button>
      </div>

      {/* Global Validation Error Message */}
      {Object.keys(errors).length > 0 && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-red-600 text-sm flex items-center gap-2 animate-pulse">
          <AlertCircle className="w-5 h-5" />
          <strong>Validation Error:</strong> Please check the tabs with red
          asterisks (*) and fix the highlighted fields.
        </div>
      )}
    </form>
  );
}
