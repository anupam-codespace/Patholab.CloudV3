"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Search,
  Trash2,
  Microscope,
  UserCheck,
  CalendarClock,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { toast } from "react-hot-toast";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

// --- 1. TYPES & SCHEMA ---
export type CatalogItem = {
  id: string;
  name: string;
  code: string;
  type: "SINGLE" | "BUNDLE" | "PROFILE" | "PARAMETER";
  price: number;
  tat?: string;
  sampleType?: { name: string };
  department?: { name: string };
  isParameter?: boolean;
};

// Zod schema enforces rules before hitting your API
const accessionSchema = z.object({
  tests: z.array(z.any()).min(1, "Please select at least one test"),
  discount: z.coerce.number().min(0, "Cannot be negative").default(0),
  paidAmount: z.coerce.number().min(0, "Cannot be negative").default(0),
  paymentMode: z.enum(["CASH", "UPI", "CARD", "DUE"]),
  collectedBy: z.string().optional(),
  // Validates exact format: YYYY-MM-DD HH:mm
  collectedAt: z
    .string()
    .regex(
      /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/,
      "Invalid format. Use YYYY-MM-DD HH:mm",
    ),
  note: z.string().optional(),
  printSlip: z.boolean().default(true),
  printBarcode: z.boolean().default(true),
  isUrgent: z.boolean().default(false),
});

type AccessionFormData = z.infer<typeof accessionSchema>;

// --- 2. DATA FETCHER (FIXED API RESPONSE HANDLING) ---
const fetchAccessionData = async (patientId: string) => {
  const [patientRes, catalogRes, parametersRes] = await Promise.all([
    fetch(`/api/workspace/patients/${patientId}`).then((r) => r.json()),
    fetch(`/api/workspace/test-catalog`).then((r) => r.json()),
    fetch(`/api/workspace/parameters`).then((r) =>
      r.ok ? r.json() : { parameters: [] },
    ),
  ]);

  // Safely extract the arrays from the API JSON wrappers
  const catalogArray = catalogRes?.tests || [];
  const parametersArray = parametersRes?.parameters || [];
  const patientData = patientRes?.patient || patientRes; // Fallback depending on your patient API format

  const formattedParameters = parametersArray.map((p: any) => ({
    id: p.id,
    name: p.name,
    code: p.code,
    type: "PARAMETER",
    price: p.price || 0,
    tat: "N/A",
    sampleType: { name: "N/A" },
    isParameter: true,
  }));

  return {
    patient: patientData,
    catalog: [...catalogArray, ...formattedParameters],
  };
};

// --- 3. MAIN COMPONENT ---
export default function AccessionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const patientId = searchParams.get("patientId");
  const doctorNameParam = searchParams.get("doc");
  const agencyNameParam = searchParams.get("agency");
  const paymentModeParam = searchParams.get("pay") || "CASH";
  const collectedByParam = searchParams.get("colBy") || "";

  // Local UI State (Search/Filter)
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<
    "ALL" | "SINGLE" | "PROFILE" | "PARAMETER"
  >("ALL");

  // React Query Fetch
  const { data, isLoading } = useQuery({
    queryKey: ["accession", patientId],
    queryFn: () => {
      if (!patientId) throw new Error("No Patient ID");
      return fetchAccessionData(patientId);
    },
    enabled: !!patientId,
    staleTime: 1000 * 60 * 5, // Cache catalog to prevent flashing
  });

  // React Hook Form Setup
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<AccessionFormData>({
    resolver: zodResolver(accessionSchema),
    defaultValues: {
      tests: [],
      discount: 0,
      paidAmount: 0,
      paymentMode: paymentModeParam as any,
      collectedBy: collectedByParam,
      collectedAt: "",
      note: "",
      printSlip: true,
      printBarcode: true,
      isUrgent: false,
    },
  });

  const selectedTests = watch("tests");
  const discount = watch("discount");
  const paidAmount = watch("paidAmount");
  const isUrgent = watch("isUrgent");

  // Derived Financials
  const subTotal = selectedTests.reduce(
    (acc: number, t: CatalogItem) => acc + (Number(t.price) || 0),
    0,
  );
  const netPayable = Math.max(0, subTotal - discount);
  const balance = Math.max(0, netPayable - paidAmount);

  // Quick Discount Logic
  const applyDiscountPercent = (percent: number) => {
    const calculated = Math.round(subTotal * (percent / 100));
    setValue("discount", calculated, { shouldValidate: true });
  };

  // Initialize Date (Client-side only to avoid SSR hydration mismatch)
  useEffect(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    setValue("collectedAt", `${year}-${month}-${day} ${hours}:${minutes}`);
  }, [setValue]);

  // React Query Mutation for Submission
  const submitMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/workspace/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to create order");
      return res.json();
    },
    onSuccess: (json) => {
      toast.success("Order Registered!");
      router.push(`/workspace/billing/${json.invoiceId}`);
    },
    onError: () => toast.error("Registration failed"),
  });

  const onSubmit = (formData: AccessionFormData) => {
    const payload = {
      patientId,
      doctorId: doctorNameParam,
      agencyName: agencyNameParam,
      paymentMode: formData.paymentMode,
      collectedBy: formData.collectedBy,
      collectedAt: new Date(formData.collectedAt),
      isUrgent: formData.isUrgent,
      tests: formData.tests.map((t: CatalogItem) => ({
        id: t.id,
        price: t.price,
        type: t.type,
      })),
      financials: { subTotal, discount, netPayable, paidAmount, balance },
      note: formData.note,
    };
    submitMutation.mutate(payload);
  };

  // Test Selection Handlers
  const addTest = (test: CatalogItem) => {
    if (selectedTests.find((t: CatalogItem) => t.id === test.id))
      return toast.error("Already added");
    setValue("tests", [...selectedTests, test], { shouldValidate: true });
  };

  const removeTest = (id: string) => {
    setValue(
      "tests",
      selectedTests.filter((t: CatalogItem) => t.id !== id),
      { shouldValidate: true },
    );
  };

  const filteredCatalog = useMemo(() => {
    if (!data?.catalog) return [];
    return data.catalog.filter((item: CatalogItem) => {
      const matchesSearch =
        item.name?.toLowerCase().includes(search.toLowerCase()) ||
        item.code?.toLowerCase().includes(search.toLowerCase());
      const matchesType = filterType === "ALL" || item.type === filterType;
      return matchesSearch && matchesType;
    });
  }, [data?.catalog, search, filterType]);

  // --- 4. SAFETY FALLBACKS ---
  if (!patientId) {
    return (
      <div className="h-[calc(100vh-60px)] flex flex-col items-center justify-center bg-slate-50 text-slate-600 gap-4">
        <div className="bg-amber-100 p-4 rounded-full">
          <UserCheck className="w-10 h-10 text-amber-600" />
        </div>
        <h2 className="text-xl font-bold text-slate-800">
          No Patient Selected
        </h2>
        <p className="text-sm text-slate-500">
          You must select a patient from the registry to create an order.
        </p>
        <Button
          onClick={() => router.push("/workspace/registration")}
          className="mt-2 bg-blue-600 hover:bg-blue-700">
          Return to Patient Search
        </Button>
      </div>
    );
  }

  if (isLoading)
    return (
      <div className="h-[calc(100vh-60px)] flex items-center justify-center text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin mr-3 text-blue-600" /> Loading
        Accession Catalog...
      </div>
    );
  if (!data || !data.patient)
    return (
      <div className="h-[calc(100vh-60px)] flex items-center justify-center text-red-500">
        Error loading patient data. Return to search.
      </div>
    );

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col h-[calc(100vh-60px)] bg-slate-100 overflow-hidden">
      {/* HEADER */}
      <div className="flex-none h-14 bg-white border-b px-4 flex justify-between items-center shadow-sm z-10">
        <div className="flex items-center gap-4 text-sm">
          <span className="font-bold text-lg text-blue-900">
            {data.patient.name}
          </span>
          <span className="text-slate-500 border-l border-slate-300 pl-3">
            {data.patient.age} {data.patient.ageUnit || "Y"} /{" "}
            {data.patient.gender}
          </span>
          <span className="text-slate-500 border-l border-slate-300 pl-3">
            ID:{" "}
            <span className="font-mono font-bold text-slate-700">
              {data.patient.patientId}
            </span>
          </span>

          {doctorNameParam && doctorNameParam !== "Self" && (
            <span className="text-slate-500 border-l border-slate-300 pl-3 font-bold text-indigo-600">
              Ref: {doctorNameParam}
            </span>
          )}
        </div>
        <div className="text-xs font-bold text-slate-400">
          {new Date().toLocaleDateString()} | {new Date().toLocaleTimeString()}
        </div>
      </div>

      <div className="flex-1 grid grid-cols-12 gap-0 overflow-hidden min-h-0">
        {/* LEFT: CATALOG */}
        <div className="col-span-3 bg-white border-r flex flex-col h-full overflow-hidden shadow-[4px_0_15px_-3px_rgba(0,0,0,0.03)] z-10">
          <div className="p-3 border-b space-y-3 bg-slate-50/50 flex-none">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search test..."
                className="pl-9 h-9 bg-white focus-visible:ring-blue-500"
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Tabs
              defaultValue="ALL"
              className="w-full"
              onValueChange={(v) => setFilterType(v as any)}>
              <TabsList className="w-full h-8 grid grid-cols-4 p-0.5 bg-slate-200/60">
                <TabsTrigger value="ALL" className="text-[10px] font-bold">
                  All
                </TabsTrigger>
                <TabsTrigger value="SINGLE" className="text-[10px] font-bold">
                  Tests
                </TabsTrigger>
                <TabsTrigger value="PROFILE" className="text-[10px] font-bold">
                  Pkg
                </TabsTrigger>
                <TabsTrigger
                  value="PARAMETER"
                  className="text-[10px] font-bold">
                  Param
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar">
            <div className="divide-y divide-slate-100">
              {filteredCatalog.map((item) => (
                <div
                  key={item.id}
                  onClick={() => addTest(item)}
                  className="p-3 hover:bg-blue-50/80 cursor-pointer group transition-colors flex justify-between items-start">
                  <div className="space-y-1">
                    <div className="font-bold text-sm text-slate-800 group-hover:text-blue-700">
                      {item.name}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className="text-[10px] h-4 px-1.5 text-slate-500 font-mono border-slate-300">
                        {item.code}
                      </Badge>
                      {item.type === "PROFILE" && (
                        <Badge className="text-[10px] h-4 px-1.5 bg-purple-100 text-purple-700 border-0">
                          Pkg
                        </Badge>
                      )}
                      {item.type === "PARAMETER" && (
                        <Badge className="text-[10px] h-4 px-1.5 bg-amber-100 text-amber-700 border-0">
                          Param
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="font-black text-sm text-slate-700">
                    ₹{item.price}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CENTER: SELECTED TESTS */}
        <div className="col-span-6 bg-slate-50/50 flex flex-col h-full border-r overflow-hidden">
          <div
            className={`p-2 border-b border-slate-200 flex justify-between items-center flex-none h-12 transition-colors ${isUrgent ? "bg-red-50" : "bg-white"}`}>
            <div className="flex items-center gap-3">
              <h2
                className={`font-bold text-sm px-2 ${isUrgent ? "text-red-700" : "text-slate-800"}`}>
                Selected Tests ({selectedTests.length})
              </h2>
              {isUrgent && (
                <Badge className="bg-red-500 text-white animate-pulse border-0">
                  <AlertTriangle className="w-3 h-3 mr-1" /> STAT Order
                </Badge>
              )}
              {errors.tests && (
                <span className="text-[10px] text-red-600 font-bold px-2 py-0.5 bg-red-100 rounded border border-red-200">
                  {errors.tests.message}
                </span>
              )}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs font-bold text-red-600 hover:bg-red-50 hover:text-red-700"
              onClick={() => setValue("tests", [])}>
              Clear All
            </Button>
          </div>

          <div className="flex-1 overflow-auto min-h-0 p-4">
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <Table>
                <TableHeader className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200">
                  <TableRow className="h-10 hover:bg-slate-50">
                    <TableHead className="w-[45%] text-xs font-bold text-slate-600 pl-4">
                      Test Name
                    </TableHead>
                    <TableHead className="w-[15%] text-xs font-bold text-slate-600">
                      Sample
                    </TableHead>
                    <TableHead className="w-[15%] text-xs font-bold text-slate-600">
                      TAT
                    </TableHead>
                    <TableHead className="w-[15%] text-xs font-bold text-slate-600 text-right">
                      Rate
                    </TableHead>
                    <TableHead className="w-[10%]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedTests.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="h-64 text-center text-slate-400">
                        <div className="flex flex-col items-center gap-2">
                          <Microscope className="h-10 w-10 opacity-20 mb-2" />
                          <span className="font-medium">
                            No tests selected yet.
                          </span>
                          <span className="text-xs">
                            Search and click a test on the left to add it.
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    selectedTests.map((t: CatalogItem, idx: number) => (
                      <TableRow
                        key={`${t.id}-${idx}`}
                        className="h-12 hover:bg-slate-50 border-b border-slate-100 transition-colors">
                        <TableCell className="pl-4 font-bold text-sm text-slate-800">
                          {t.name}
                          {t.type === "PROFILE" && (
                            <span className="ml-2 text-[10px] text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded">
                              Pkg
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs font-medium text-slate-500">
                          {t.sampleType?.name || "-"}
                        </TableCell>
                        <TableCell className="text-xs font-medium text-slate-500">
                          {t.tat || "-"}
                        </TableCell>
                        <TableCell className="text-right font-black text-slate-800">
                          ₹{t.price}
                        </TableCell>
                        <TableCell className="text-right pr-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50"
                            onClick={() => removeTest(t.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>

        {/* RIGHT: BILLING & ACTION */}
        <div className="col-span-3 bg-white flex flex-col h-full shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.05)] z-20 overflow-hidden relative">
          <div className="p-3 border-b bg-blue-50/50 flex-none h-12 flex items-center">
            <h3 className="font-bold text-blue-900 text-sm">
              Payment & Billing Details
            </h3>
          </div>

          <div className="flex-1 overflow-y-auto min-h-0 p-4 space-y-5 custom-scrollbar">
            {/* Totals */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[11px] uppercase font-bold text-slate-500 tracking-wider">
                  Total
                </Label>
                <Input
                  readOnly
                  value={subTotal}
                  className="h-10 bg-slate-50 font-black text-lg border-slate-200 text-slate-800"
                  tabIndex={-1}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] uppercase font-bold text-slate-500 tracking-wider">
                  Discount (₹)
                </Label>
                <Input
                  type="number"
                  {...register("discount")}
                  className="h-10 text-red-600 font-bold text-base focus-visible:ring-red-500 border-slate-200"
                />
                <div className="flex gap-1.5 mt-1.5">
                  <Badge
                    variant="outline"
                    className="text-[10px] px-2 h-5 cursor-pointer hover:bg-slate-100 text-slate-600 border-slate-300 font-bold"
                    onClick={() => applyDiscountPercent(10)}>
                    10%
                  </Badge>
                  <Badge
                    variant="outline"
                    className="text-[10px] px-2 h-5 cursor-pointer hover:bg-slate-100 text-slate-600 border-slate-300 font-bold"
                    onClick={() => applyDiscountPercent(20)}>
                    20%
                  </Badge>
                </div>
              </div>
            </div>

            <div className="bg-indigo-600 text-white rounded-xl p-3.5 flex justify-between items-center shadow-md shadow-indigo-500/20">
              <span className="text-xs font-bold uppercase tracking-wider opacity-90">
                Net Payable
              </span>
              <span className="font-black text-2xl tracking-tight">
                ₹ {netPayable}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[11px] uppercase font-bold text-slate-500 tracking-wider">
                  Paid Amount
                </Label>
                <Input
                  type="number"
                  {...register("paidAmount")}
                  className="h-10 border-green-300 bg-green-50/30 text-green-700 font-bold text-base focus-visible:ring-green-500"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] uppercase font-bold text-slate-500 tracking-wider">
                  Pay Mode
                </Label>
                <Select
                  onValueChange={(v) => setValue("paymentMode", v as any)}
                  defaultValue={watch("paymentMode")}>
                  <SelectTrigger className="h-10 text-sm font-bold border-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASH">Cash</SelectItem>
                    <SelectItem value="UPI">UPI / QR</SelectItem>
                    <SelectItem value="CARD">Card</SelectItem>
                    <SelectItem value="DUE">Credit (Due)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-between items-center text-sm font-bold border-t border-slate-200 pt-3">
              <span className="text-slate-500">Balance Due:</span>
              <span
                className={balance > 0 ? "text-red-600" : "text-emerald-600"}>
                ₹ {balance}
              </span>
            </div>

            {/* SAMPLE DETAILS */}
            <div className="space-y-4 pt-2 border-t border-slate-100">
              <div className="space-y-1.5">
                <Label className="text-[11px] uppercase font-bold text-slate-500 tracking-wider">
                  Collected By
                </Label>
                <div className="relative">
                  <UserCheck className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    {...register("collectedBy")}
                    className="h-10 pl-9 text-sm border-slate-200 bg-slate-50 focus:bg-white font-medium"
                    placeholder="Phlebotomist Name..."
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] uppercase font-bold text-slate-500 tracking-wider">
                  Collected At
                </Label>
                <div className="relative">
                  <CalendarClock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  <Input
                    {...register("collectedAt")}
                    className={`h-10 pl-9 text-sm font-mono border-slate-200 bg-slate-50 focus:bg-white ${errors.collectedAt ? "border-red-500 text-red-600 focus:border-red-500 focus:bg-red-50" : ""}`}
                    placeholder="YYYY-MM-DD HH:mm"
                  />
                </div>
                {errors.collectedAt && (
                  <p className="text-[10px] text-red-500 font-bold leading-tight bg-red-50 p-1.5 rounded">
                    {errors.collectedAt.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t border-slate-100">
              <Label className="text-[11px] uppercase font-bold text-slate-500 tracking-wider">
                Order Options
              </Label>
              <div className="flex flex-col gap-3">
                <div className="flex gap-6">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="slip"
                      checked={watch("printSlip")}
                      onCheckedChange={(v) => setValue("printSlip", !!v)}
                    />
                    <label
                      htmlFor="slip"
                      className="text-sm font-semibold text-slate-700 cursor-pointer">
                      Print Slip
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="barcode"
                      checked={watch("printBarcode")}
                      onCheckedChange={(v) => setValue("printBarcode", !!v)}
                    />
                    <label
                      htmlFor="barcode"
                      className="text-sm font-semibold text-slate-700 cursor-pointer">
                      Print Barcode
                    </label>
                  </div>
                </div>
                {/* Urgent Checkbox */}
                <div className="flex items-center space-x-2 bg-red-50 p-2 rounded-lg border border-red-100 w-fit">
                  <Checkbox
                    id="urgent"
                    checked={watch("isUrgent")}
                    onCheckedChange={(v) => setValue("isUrgent", !!v)}
                    className="border-red-400 data-[state=checked]:bg-red-600"
                  />
                  <label
                    htmlFor="urgent"
                    className="text-sm text-red-700 font-bold cursor-pointer tracking-wide">
                    Mark as STAT (Urgent)
                  </label>
                </div>
              </div>
            </div>

            <div className="space-y-1.5 pt-2 pb-4 border-t border-slate-100">
              <Label className="text-[11px] uppercase font-bold text-slate-500 tracking-wider">
                Clinical Note
              </Label>
              <Textarea
                {...register("note")}
                placeholder="Fasting status, specific instructions..."
                className="h-16 text-sm resize-none border-slate-200"
              />
            </div>
          </div>

          <div className="p-4 border-t border-slate-200 bg-white flex gap-3 flex-none z-30 shadow-[0_-4px_15px_-3px_rgba(0,0,0,0.05)]">
            <Button
              type="button"
              variant="outline"
              className="flex-1 h-11 font-bold text-slate-600 border-slate-300 hover:bg-slate-100"
              onClick={() => router.back()}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-[2] h-11 font-bold text-base bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-500/20"
              disabled={submitMutation.isPending || selectedTests.length === 0}>
              {submitMutation.isPending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                "Submit & Bill"
              )}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
