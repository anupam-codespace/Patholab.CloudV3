"use client";
export const dynamic = "force-dynamic";

import { useState, useMemo, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Search,
  Trash2,
  UserCheck,
  CalendarClock,
  Loader2,
  AlertTriangle,
  Receipt,
  User,
  FlaskConical,
  CreditCard,
  ChevronRight,
  Plus,
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

const accessionSchema = z.object({
  tests: z.array(z.any()).min(1, "Please select at least one test"),
  discount: z.coerce.number().min(0, "Cannot be negative").default(0),
  paidAmount: z.coerce.number().min(0, "Cannot be negative").default(0),
  paymentMode: z.enum(["CASH", "UPI", "CARD", "DUE"]),
  collectedBy: z.string().optional(),
  collectedAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/, "Use YYYY-MM-DD HH:mm"),
  note: z.string().optional(),
  printSlip: z.boolean().default(true),
  printBarcode: z.boolean().default(true),
  isUrgent: z.boolean().default(false),
});

type AccessionFormData = z.infer<typeof accessionSchema>;

// --- 2. DATA FETCHER ---
const fetchAccessionData = async (patientId: string) => {
  const [patientRes, catalogRes, parametersRes] = await Promise.all([
    fetch(`/api/workspace/patients/${patientId}`).then((r) => r.json()),
    fetch(`/api/workspace/test-catalog`).then((r) => r.json()),
    fetch(`/api/workspace/parameters`).then((r) =>
      r.ok ? r.json() : { parameters: [] },
    ),
  ]);

  const catalogArray = catalogRes?.tests || [];
  const parametersArray = parametersRes?.parameters || [];
  const patientData = patientRes?.patient || patientRes;

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
  const isNewVisit = searchParams.get("isNewVisit") === "true"; // Silently passed to backend
  const doctorNameParam = searchParams.get("doc");
  const agencyNameParam = searchParams.get("agency");
  const paymentModeParam = searchParams.get("pay") || "CASH";
  const collectedByParam = searchParams.get("colBy") || "";

  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<
    "ALL" | "SINGLE" | "PROFILE" | "PARAMETER"
  >("ALL");

  const { data, isLoading } = useQuery({
    queryKey: ["accession", patientId],
    queryFn: () => {
      if (!patientId) throw new Error("No Patient ID");
      return fetchAccessionData(patientId);
    },
    enabled: !!patientId,
    staleTime: 1000 * 60 * 5,
  });

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

  const subTotal = selectedTests.reduce(
    (acc: number, t: CatalogItem) => acc + (Number(t.price) || 0),
    0,
  );
  const netPayable = Math.max(0, subTotal - discount);
  const balance = Math.max(0, netPayable - paidAmount);

  const applyDiscountPercent = (percent: number) => {
    const calculated = Math.round(subTotal * (percent / 100));
    setValue("discount", calculated, { shouldValidate: true });
  };

  useEffect(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    setValue("collectedAt", `${year}-${month}-${day} ${hours}:${minutes}`);
  }, [setValue]);

  // --- API MUTATION ---
  const submitMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/workspace/accession", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();

      if (res.status === 402)
        throw new Error(
          `Insufficient Wallet Balance. Needed: ₹${json.required}`,
        );
      if (!res.ok) throw new Error(json.error || "Failed to create order");

      return json;
    },
    onSuccess: (json) => {
      toast.success("Visit Registered & Invoice Generated!");
      router.push(`/workspace/billing/${json.data?.invoice?.id}`);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const onSubmit = (formData: AccessionFormData) => {
    const payload = {
      patientId,
      isNewVisit,
      subtotal: subTotal,
      discountAmount: discount,
      grandTotal: netPayable,
      doctorId: doctorNameParam === "Self" ? null : doctorNameParam,
      agencyId: agencyNameParam === "Direct" ? null : agencyNameParam,
      tests: formData.tests.map((t: CatalogItem) => ({
        testId: t.id,
        testCode: t.code,
        testName: t.name,
        price: t.price,
      })),
      paymentMode: formData.paymentMode,
      paidAmount: formData.paidAmount,
      collectedBy: formData.collectedBy,
      collectedAt: new Date(formData.collectedAt),
      isUrgent: formData.isUrgent,
      note: formData.note,
    };
    submitMutation.mutate(payload);
  };

  const addTest = (test: CatalogItem) => {
    if (selectedTests.find((t: CatalogItem) => t.id === test.id))
      return toast.error("Already added to cart");
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

  // --- SAFETY SCREENS ---
  if (!patientId) {
    return (
      <div className="h-[calc(100vh-60px)] flex flex-col items-center justify-center bg-slate-50 text-slate-600 gap-4">
        <div className="bg-amber-100 p-5 rounded-full shadow-inner">
          <UserCheck className="w-12 h-12 text-amber-600" />
        </div>
        <div className="text-center">
          <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">
            No Patient Selected
          </h2>
          <p className="text-sm font-medium text-slate-500 mt-1">
            Accession flow requires a linked patient profile.
          </p>
        </div>
        <Button
          onClick={() => router.push("/workspace/registration")}
          className="mt-4 bg-indigo-600 hover:bg-indigo-700 shadow-md font-bold rounded-xl px-8 h-12">
          Return to Registry
        </Button>
      </div>
    );
  }

  if (isLoading)
    return (
      <div className="h-[calc(100vh-60px)] flex items-center justify-center text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin mr-3 text-indigo-600" />{" "}
        Preparing Workspace...
      </div>
    );
  if (!data || !data.patient)
    return (
      <div className="h-[calc(100vh-60px)] flex items-center justify-center text-red-500 font-bold">
        Error loading patient identity profile.
      </div>
    );

  const initials = data.patient.name.substring(0, 2).toUpperCase();

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col h-[100dvh] lg:h-[calc(100vh-60px)] bg-slate-50 overflow-hidden font-sans relative">
      {/* 🌟 STICKY TOP HEADER BAR */}
      <div className="flex-none h-[72px] bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 lg:px-6 flex justify-between items-center shadow-sm z-30 sticky top-0">
        <div className="flex items-center gap-3 lg:gap-4">
          <div className="hidden sm:flex h-11 w-11 bg-indigo-100 text-indigo-700 font-bold text-base rounded-full items-center justify-center shadow-inner shrink-0">
            {initials}
          </div>
          <div>
            <h1 className="font-black text-lg lg:text-xl text-slate-900 leading-tight truncate max-w-[200px] sm:max-w-md">
              {data.patient.name}
            </h1>
            <div className="flex items-center gap-2 text-xs lg:text-sm font-bold text-slate-500 uppercase tracking-wide mt-0.5">
              <span>
                {data.patient.age} {data.patient.ageUnit || "Y"} •{" "}
                {data.patient.gender}
              </span>
              <span className="hidden sm:inline text-slate-300">|</span>
              <span className="hidden sm:inline text-indigo-600 font-mono bg-indigo-50 px-1.5 rounded">
                {data.patient.patientId}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          {doctorNameParam && doctorNameParam !== "Self" && (
            <div className="flex flex-col items-end">
              <span className="text-[10px] lg:text-xs font-bold text-slate-400 uppercase tracking-widest">
                Referral
              </span>
              <span className="text-sm lg:text-base font-black text-slate-700 flex items-center gap-1.5 truncate max-w-[120px] sm:max-w-xs">
                <User className="w-4 h-4 opacity-50" /> {doctorNameParam}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 🧩 RESPONSIVE 3-COLUMN LAYOUT (Grid on Desktop, Stacked on Mobile) */}
      <div className="flex-1 flex flex-col lg:grid lg:grid-cols-12 overflow-y-auto lg:overflow-hidden pb-24 lg:pb-0">
        {/* 📚 LEFT: TEST CATALOG */}
        <div className="lg:col-span-3 bg-white border-b lg:border-b-0 lg:border-r border-slate-200/80 flex flex-col min-h-[400px] lg:h-full z-10 shadow-sm">
          <div className="p-4 border-b border-slate-100 space-y-3 bg-slate-50 flex-none sticky top-0 z-20">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search tests or codes..."
                className="pl-9 h-11 bg-white border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/20 rounded-xl text-sm font-medium shadow-sm"
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Tabs
              defaultValue="ALL"
              className="w-full"
              onValueChange={(v) => setFilterType(v as any)}>
              <TabsList className="w-full h-10 grid grid-cols-4 p-1 bg-slate-200/60 rounded-xl">
                <TabsTrigger
                  value="ALL"
                  className="text-xs font-bold rounded-lg">
                  All
                </TabsTrigger>
                <TabsTrigger
                  value="SINGLE"
                  className="text-xs font-bold rounded-lg">
                  Tests
                </TabsTrigger>
                <TabsTrigger
                  value="PROFILE"
                  className="text-xs font-bold rounded-lg">
                  Pkg
                </TabsTrigger>
                <TabsTrigger
                  value="PARAMETER"
                  className="text-xs font-bold rounded-lg">
                  Param
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
            <div className="space-y-1.5">
              {filteredCatalog.map((item) => (
                <div
                  key={item.id}
                  onClick={() => addTest(item)}
                  className="p-3.5 hover:bg-indigo-50/80 bg-white rounded-xl cursor-pointer group transition-all flex justify-between items-center border border-slate-100 hover:border-indigo-200 hover:shadow-sm">
                  <div className="space-y-1">
                    <div className="font-bold text-sm lg:text-base text-slate-800 group-hover:text-indigo-700 leading-tight">
                      {item.name}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className="text-[10px] text-slate-500 font-mono border-slate-200 bg-slate-50">
                        {item.code}
                      </Badge>
                      {item.type === "PROFILE" && (
                        <Badge className="text-[10px] bg-purple-100 text-purple-700 border-0 uppercase px-2">
                          Package
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-black text-sm lg:text-base text-slate-700">
                      ₹{item.price}
                    </span>
                    <Plus className="w-5 h-5 text-indigo-400 group-hover:text-indigo-600 transition-colors" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 🔬 CENTER: SELECTED CART */}
        <div className="lg:col-span-5 xl:col-span-6 bg-slate-50/50 flex flex-col min-h-[300px] lg:h-full border-b lg:border-b-0 lg:border-r border-slate-200/80 relative">
          <div
            className={`p-4 border-b border-slate-200 flex justify-between items-center flex-none h-16 sticky top-0 z-20 transition-colors ${isUrgent ? "bg-red-50/90 backdrop-blur-sm" : "bg-white/90 backdrop-blur-sm"}`}>
            <div className="flex items-center gap-3">
              <h2
                className={`font-black text-lg ${isUrgent ? "text-red-700" : "text-slate-800"}`}>
                Cart ({selectedTests.length})
              </h2>
              {isUrgent && (
                <Badge className="bg-red-500 text-white animate-pulse border-0 shadow-sm">
                  <AlertTriangle className="w-3.5 h-3.5 mr-1" /> STAT
                </Badge>
              )}
              {errors.tests && (
                <span className="text-xs text-rose-600 font-bold px-2 py-1 bg-rose-100 rounded-md shadow-sm">
                  {errors.tests.message}
                </span>
              )}
            </div>
            {selectedTests.length > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-sm font-bold text-rose-600 hover:bg-rose-50 rounded-lg"
                onClick={() => setValue("tests", [])}>
                Clear All
              </Button>
            )}
          </div>

          <div className="flex-1 overflow-auto p-4 lg:p-6 custom-scrollbar">
            {selectedTests.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full min-h-[250px] text-slate-400">
                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
                  <FlaskConical className="h-10 w-10 text-slate-300" />
                </div>
                <span className="font-black text-slate-600 text-xl">
                  Cart is Empty
                </span>
                <span className="text-sm font-medium text-center mt-2 max-w-sm">
                  Search and tap on tests from the catalog to add them to this
                  order.
                </span>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedTests.map((t: CatalogItem, idx: number) => (
                  <div
                    key={`${t.id}-${idx}`}
                    className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between group hover:border-indigo-200 transition-colors">
                    <div className="space-y-1">
                      <div className="font-bold text-base text-slate-900">
                        {t.name}
                      </div>
                      <div className="flex gap-3 text-xs font-semibold text-slate-500">
                        <span>Sample: {t.sampleType?.name || "-"}</span>
                        <span>•</span>
                        <span>TAT: {t.tat || "-"}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-black text-lg text-slate-900">
                        ₹{t.price}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                        onClick={() => removeTest(t.id)}>
                        <Trash2 className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 💳 RIGHT: FINANCIALS & BILLING */}
        <div className="lg:col-span-4 xl:col-span-3 bg-white flex flex-col lg:h-full z-20 relative">
          <div className="hidden lg:flex p-4 border-b border-slate-100 bg-indigo-50/30 flex-none h-16 items-center gap-2">
            <Receipt className="h-5 w-5 text-indigo-600" />
            <h3 className="font-black text-indigo-900 text-base">
              Checkout & Billing
            </h3>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-6 lg:pb-24 custom-scrollbar">
            {/* Financial Ledger */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs uppercase font-bold text-slate-500">
                  Gross Total
                </Label>
                <Input
                  readOnly
                  value={subTotal}
                  className="h-12 bg-slate-50 font-black text-xl border-slate-200 text-slate-800 rounded-xl"
                  tabIndex={-1}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase font-bold text-slate-500">
                  Discount (₹)
                </Label>
                <Input
                  type="number"
                  {...register("discount")}
                  className="h-12 text-rose-600 font-black text-xl focus-visible:ring-rose-500 border-slate-200 rounded-xl"
                />
                <div className="flex gap-2 mt-1">
                  <Badge
                    variant="outline"
                    className="text-[10px] px-2.5 h-6 cursor-pointer hover:bg-slate-100 text-slate-600 font-bold uppercase rounded-md"
                    onClick={() => applyDiscountPercent(10)}>
                    10%
                  </Badge>
                  <Badge
                    variant="outline"
                    className="text-[10px] px-2.5 h-6 cursor-pointer hover:bg-slate-100 text-slate-600 font-bold uppercase rounded-md"
                    onClick={() => applyDiscountPercent(20)}>
                    20%
                  </Badge>
                </div>
              </div>
            </div>

            <div className="bg-slate-900 text-white rounded-2xl p-5 flex justify-between items-center shadow-xl relative overflow-hidden">
              <div className="absolute -right-4 -top-4 opacity-10">
                <CreditCard className="w-24 h-24" />
              </div>
              <div className="relative z-10 flex flex-col">
                <span className="text-xs font-bold uppercase tracking-widest text-indigo-300">
                  Net Payable
                </span>
                <span className="font-black text-4xl tracking-tight mt-1">
                  ₹{netPayable}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs uppercase font-bold text-slate-500">
                  Paid Today
                </Label>
                <Input
                  type="number"
                  {...register("paidAmount")}
                  className="h-12 border-emerald-300 bg-emerald-50 text-emerald-700 font-black text-xl focus-visible:ring-emerald-500 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase font-bold text-slate-500">
                  Pay Mode
                </Label>
                <Select
                  onValueChange={(v) => setValue("paymentMode", v as any)}
                  defaultValue={watch("paymentMode")}>
                  <SelectTrigger className="h-12 text-sm font-bold border-slate-200 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="CASH">Cash</SelectItem>
                    <SelectItem value="UPI">UPI / QR</SelectItem>
                    <SelectItem value="CARD">Card</SelectItem>
                    <SelectItem value="DUE">Credit (Due)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-between items-center text-base font-black border-t border-slate-100 pt-5">
              <span className="text-slate-500">Balance Due</span>
              <span
                className={
                  balance > 0
                    ? "text-rose-600 text-xl"
                    : "text-emerald-600 text-xl"
                }>
                ₹ {balance}
              </span>
            </div>

            {/* Logistics & Meta */}
            <div className="space-y-5 pt-5 border-t border-slate-100">
              <div className="space-y-2">
                <Label className="text-xs uppercase font-bold text-slate-500">
                  Collector / Phleb.
                </Label>
                <div className="relative">
                  <UserCheck className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <Input
                    {...register("collectedBy")}
                    className="h-12 pl-11 text-base border-slate-200 bg-slate-50 focus:bg-white font-medium rounded-xl"
                    placeholder="Staff Name..."
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex items-center space-x-3 bg-slate-50 px-4 py-3 rounded-xl border border-slate-200 flex-1">
                  <Checkbox
                    id="slip"
                    checked={watch("printSlip")}
                    onCheckedChange={(v) => setValue("printSlip", !!v)}
                    className="w-5 h-5 rounded-[4px]"
                  />
                  <label
                    htmlFor="slip"
                    className="text-sm font-bold text-slate-700 cursor-pointer">
                    Print Slip
                  </label>
                </div>
                <div className="flex items-center space-x-3 bg-slate-50 px-4 py-3 rounded-xl border border-slate-200 flex-1">
                  <Checkbox
                    id="barcode"
                    checked={watch("printBarcode")}
                    onCheckedChange={(v) => setValue("printBarcode", !!v)}
                    className="w-5 h-5 rounded-[4px]"
                  />
                  <label
                    htmlFor="barcode"
                    className="text-sm font-bold text-slate-700 cursor-pointer">
                    Barcodes
                  </label>
                </div>
              </div>

              <div className="flex items-center space-x-3 bg-rose-50 p-3 rounded-xl border border-rose-200 w-full">
                <Checkbox
                  id="urgent"
                  checked={watch("isUrgent")}
                  onCheckedChange={(v) => setValue("isUrgent", !!v)}
                  className="w-5 h-5 border-rose-400 data-[state=checked]:bg-rose-600"
                />
                <label
                  htmlFor="urgent"
                  className="text-base text-rose-700 font-bold cursor-pointer select-none">
                  Mark Order as STAT (Urgent)
                </label>
              </div>

              <div className="space-y-2">
                <Label className="text-xs uppercase font-bold text-slate-500">
                  Internal Notes
                </Label>
                <Textarea
                  {...register("note")}
                  placeholder="Clinical history, fasting..."
                  className="h-20 text-sm resize-none border-slate-200 rounded-xl bg-slate-50 focus:bg-white"
                />
              </div>
            </div>
          </div>

          {/* DESKTOP STICKY BOTTOM BAR */}
          <div className="hidden lg:flex p-4 border-t border-slate-200 bg-white flex-none z-30 shadow-[0_-10px_30px_-10px_rgba(0,0,0,0.05)]">
            <Button
              type="button"
              variant="outline"
              className="w-1/3 h-14 font-bold text-slate-600 border-slate-200 rounded-xl mr-3"
              onClick={() => router.back()}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="w-2/3 h-14 font-black text-lg bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-lg shadow-indigo-500/30"
              disabled={submitMutation.isPending || selectedTests.length === 0}>
              {submitMutation.isPending ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                "Save & Generate Bill"
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* 📱 MOBILE STICKY BOTTOM ACTION BAR */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200 shadow-[0_-10px_30px_-10px_rgba(0,0,0,0.1)] z-50 flex items-center justify-between pb-safe">
        <div className="flex flex-col">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
            Total ({selectedTests.length} Items)
          </span>
          <span className="text-2xl font-black text-indigo-700">
            ₹{netPayable}
          </span>
        </div>
        <Button
          type="submit"
          className="h-14 px-8 font-black text-lg bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-lg shadow-indigo-500/30"
          disabled={submitMutation.isPending || selectedTests.length === 0}>
          {submitMutation.isPending ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : (
            "Save & Bill"
          )}
        </Button>
      </div>
    </form>
  );
}
