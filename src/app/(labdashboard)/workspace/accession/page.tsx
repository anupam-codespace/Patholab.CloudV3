"use client";
export const dynamic = "force-dynamic";

import { useState, useMemo, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { getDoctors } from "@/actions/doctor-management";
import { getAgencies } from "@/actions/agency-management";
import {
  Search,
  Trash2,
  UserCheck,
  Loader2,
  AlertTriangle,
  Receipt,
  User,
  FlaskConical,
  CreditCard,
  Stethoscope,
  Building2,
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
    fetch(`/api/workspace/patients/${patientId}`).then((r) =>
      r.ok ? r.json() : null,
    ),
    fetch(`/api/workspace/test-catalog`).then((r) => (r.ok ? r.json() : null)),
    fetch(`/api/workspace/parameters`).then((r) =>
      r.ok ? r.json() : { parameters: [] },
    ),
  ]);

  if (!patientRes) throw new Error("Failed to fetch patient data");

  const catalogArray = catalogRes?.tests || catalogRes?.data || [];
  const parametersArray =
    parametersRes?.parameters || parametersRes?.data || [];

  const patientData = patientRes?.patient || patientRes?.data || patientRes;

  if (!patientData || !patientData.id) {
    throw new Error("Patient profile data is missing or incomplete.");
  }

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
  const isNewVisit = searchParams.get("isNewVisit") === "true";
  const doctorNameParam = searchParams.get("doc");
  const agencyNameParam = searchParams.get("agency");
  const collectedByParam = searchParams.get("colBy") || "";

  // ✅ Referral state — doctor & agency selectors
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>("");
  const [selectedAgencyId, setSelectedAgencyId] = useState<string>("");

  // Fetch doctors and agencies for the referral dropdowns
  const { data: doctors } = useQuery({
    queryKey: ["doctors-for-accession"],
    queryFn: async () => await getDoctors(),
  });
  const { data: agencies } = useQuery({
    queryKey: ["agencies-for-accession"],
    queryFn: async () => await getAgencies(),
  });

  // Safely map URL payment parameters to strict Zod Enums
  const rawPay = searchParams.get("pay")?.toUpperCase() || "CASH";
  let safePaymentMode = "CASH";
  if (rawPay.includes("UPI") || rawPay.includes("QR")) safePaymentMode = "UPI";
  else if (rawPay.includes("CARD")) safePaymentMode = "CARD";
  else if (rawPay.includes("DUE") || rawPay.includes("CREDIT"))
    safePaymentMode = "DUE";

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
      paymentMode: safePaymentMode as any,
      collectedBy: collectedByParam,
      collectedAt: "",
      note: "",
      printSlip: true,
      printBarcode: true,
      isUrgent: false,
    },
  });

  useEffect(() => {
    register("tests");
    register("paymentMode");
    register("collectedAt");
    register("printSlip");
    register("printBarcode");
    register("isUrgent");
  }, [register]);

  const selectedTests = watch("tests");
  const discount = watch("discount");
  const paidAmount = watch("paidAmount");
  const paymentMode = watch("paymentMode");
  const isUrgent = watch("isUrgent");

  const subTotal = selectedTests.reduce(
    (acc: number, t: CatalogItem) => acc + (Number(t.price) || 0),
    0,
  );
  const netPayable = Math.max(0, subTotal - discount);
  const balance = Math.max(0, netPayable - paidAmount);

  useEffect(() => {
    if (paymentMode !== "DUE") {
      setValue("paidAmount", netPayable, { shouldValidate: true });
    } else {
      setValue("paidAmount", 0, { shouldValidate: true });
    }
  }, [netPayable, paymentMode, setValue]);

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
    setValue("collectedAt", `${year}-${month}-${day} ${hours}:${minutes}`, {
      shouldValidate: true,
    });
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
        throw new Error(json.error || `Insufficient Wallet Balance.`);
      if (!res.ok) throw new Error(json.error || "Failed to create order");

      return json;
    },
    onSuccess: (json) => {
      toast.success("Visit Registered & Invoice Generated!");
      router.push(`/workspace/billing/${json.data?.id}`);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const onSubmit = (formData: AccessionFormData) => {
    // Construct collectedAt date safely
    const collectedDate = new Date(
      formData.collectedAt.replace(" ", "T") + ":00",
    );

    const payload = {
      patientId,
      isNewVisit,
      subtotal: subTotal,
      discountAmount: formData.discount,
      grandTotal: netPayable,
      doctorId:
        selectedDoctorId ||
        (doctorNameParam && doctorNameParam !== "Self"
          ? doctorNameParam
          : null),
      agencyId:
        selectedAgencyId ||
        (agencyNameParam && agencyNameParam !== "Direct"
          ? agencyNameParam
          : null),
      tests: formData.tests.map((t: CatalogItem) => ({
        testTemplateId: t.id, // ✅ FIXED: Crucial parameter mapped properly
        testCode: t.code,
        testName: t.name,
        price: t.price,
      })),
      paymentMode: formData.paymentMode,
      paidAmount: formData.paidAmount,
      collectedBy: formData.collectedBy,
      collectedAt: collectedDate.toISOString(),
      isUrgent: formData.isUrgent,
      note: formData.note,
    };

    submitMutation.mutate(payload);
  };

  const onFormError = (errors: any) => {
    console.error("Validation Errors:", errors);
    toast.error("Please select at least one test to proceed.");
  };

  const addTest = (test: CatalogItem) => {
    if (selectedTests.find((t: CatalogItem) => t.id === test.id))
      return toast.error("Already added to cart");
    setValue("tests", [...selectedTests, test], {
      shouldValidate: true,
      shouldDirty: true,
    });
  };

  const removeTest = (id: string) => {
    setValue(
      "tests",
      selectedTests.filter((t: CatalogItem) => t.id !== id),
      { shouldValidate: true, shouldDirty: true },
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
          className="mt-4 bg-primary hover:bg-primary/90 shadow-md font-bold rounded-xl px-8 h-12">
          Return to Registry
        </Button>
      </div>
    );
  }

  if (isLoading)
    return (
      <div className="h-[calc(100vh-60px)] flex items-center justify-center text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin mr-3 text-primary" />{" "}
        Preparing Workspace...
      </div>
    );

  if (!data || !data.patient)
    return (
      <div className="h-[calc(100vh-60px)] flex flex-col items-center justify-center text-red-500 gap-2">
        <AlertTriangle className="h-10 w-10 text-red-500 mb-2" />
        <span className="font-bold text-lg">
          Error loading patient profile.
        </span>
        <Button
          variant="outline"
          onClick={() => router.push("/workspace/registration")}>
          Go Back
        </Button>
      </div>
    );

  const initials = data?.patient?.name?.substring(0, 2).toUpperCase() || "PT";

  return (
    <form
      id="accession-form"
      onSubmit={handleSubmit(onSubmit, onFormError)}
      className="flex flex-col h-[calc(100vh-80px)] bg-slate-50 font-sans relative pb-20 lg:pb-0">
      {/* 🌟 STICKY TOP HEADER BAR */}
      <div className="flex-none h-[72px] bg-white border-b border-slate-200 px-4 lg:px-6 flex justify-between items-center shadow-sm z-30">
        <div className="flex items-center gap-3 lg:gap-4">
          <div className="hidden sm:flex h-11 w-11 bg-indigo-100 text-primary font-bold text-base rounded-xl items-center justify-center shadow-inner shrink-0">
            {initials}
          </div>
          <div>
            <h1 className="font-bold text-lg lg:text-xl text-slate-900 leading-tight truncate max-w-[200px] sm:max-w-md">
              {data.patient.name || "Unknown Patient"}
            </h1>
            <div className="flex items-center gap-2 text-xs lg:text-sm font-semibold text-slate-500 mt-0.5">
              <span>
                {data.patient.age} {data.patient.ageUnit || "Y"} •{" "}
                {data.patient.gender}
              </span>
              <span className="hidden sm:inline text-slate-300">|</span>
              <span className="hidden sm:inline text-primary font-mono bg-indigo-50 px-2 rounded-md">
                ID: {data.patient.patientId || data.patient.id.substring(0, 8)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Doctor Selector */}
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1">
              <Stethoscope className="w-3 h-3" /> Doctor
            </span>
            <select
              value={selectedDoctorId}
              onChange={(e) => setSelectedDoctorId(e.target.value)}
              className="h-9 text-sm border border-slate-200 rounded-lg px-2 bg-white font-medium text-slate-700 focus:ring-2 focus:ring-primary/20 focus:border-primary">
              <option value="">Self / No Doctor</option>
              {doctors?.map((doc: any) => (
                <option key={doc.id} value={doc.id}>
                  {doc.name} ({Number(doc.commissionRate || 0)}
                  {doc.commissionType === "PERCENTAGE" ? "%" : " Flat"})
                </option>
              ))}
            </select>
          </div>

          {/* Agency Selector */}
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1">
              <Building2 className="w-3 h-3" /> Agency
            </span>
            <select
              value={selectedAgencyId}
              onChange={(e) => setSelectedAgencyId(e.target.value)}
              className="h-9 text-sm border border-slate-200 rounded-lg px-2 bg-white font-medium text-slate-700 focus:ring-2 focus:ring-primary/20 focus:border-primary">
              <option value="">Direct / No Agency</option>
              {agencies?.map((ag: any) => (
                <option key={ag.id} value={ag.id}>
                  {ag.agencyName} ({Number(ag.commissionRate || 0)}
                  {ag.commissionType === "PERCENTAGE" ? "%" : " Flat"})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 🧩 RESPONSIVE 3-COLUMN LAYOUT */}
      <div className="flex-1 flex flex-col lg:grid lg:grid-cols-12 overflow-hidden">
        {/* 📚 LEFT: TEST CATALOG */}
        <div className="lg:col-span-3 bg-white border-r border-slate-200 flex flex-col h-full z-10 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 space-y-3 bg-slate-50 flex-none">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search tests..."
                className="pl-9 h-10 bg-white border-slate-200 focus:border-indigo-500 rounded-xl text-sm font-medium shadow-sm"
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Tabs
              defaultValue="ALL"
              className="w-full"
              onValueChange={(v) => setFilterType(v as any)}>
              <TabsList className="w-full h-9 grid grid-cols-4 p-1 bg-slate-200/60 rounded-xl">
                <TabsTrigger
                  value="ALL"
                  className="text-[10px] font-bold rounded-lg">
                  All
                </TabsTrigger>
                <TabsTrigger
                  value="SINGLE"
                  className="text-[10px] font-bold rounded-lg">
                  Tests
                </TabsTrigger>
                <TabsTrigger
                  value="PROFILE"
                  className="text-[10px] font-bold rounded-lg">
                  Pkg
                </TabsTrigger>
                <TabsTrigger
                  value="PARAMETER"
                  className="text-[10px] font-bold rounded-lg">
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
                  className="p-3 hover:bg-indigo-50 bg-white rounded-xl cursor-pointer group transition-all flex justify-between items-center border border-slate-100 hover:border-indigo-200">
                  <div className="space-y-1">
                    <div className="font-semibold text-sm text-slate-800 leading-tight">
                      {item.name}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className="text-[9px] text-slate-500 font-mono border-slate-200 bg-slate-50">
                        {item.code}
                      </Badge>
                      {item.type === "PROFILE" && (
                        <Badge className="text-[9px] bg-purple-100 text-purple-700 border-0 uppercase px-1.5">
                          Pkg
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-700">
                      ₹{Number(item.price).toFixed(2)}
                    </span>
                    <Plus className="w-4 h-4 text-indigo-400 group-hover:text-primary" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 🔬 CENTER: SELECTED CART */}
        <div className="lg:col-span-5 bg-slate-50/50 flex flex-col h-full border-r border-slate-200 relative overflow-hidden">
          <div
            className={`p-4 border-b border-slate-200 flex justify-between items-center flex-none h-14 transition-colors ${isUrgent ? "bg-red-50" : "bg-white"}`}>
            <div className="flex items-center gap-3">
              <h2
                className={`font-bold text-base ${isUrgent ? "text-red-700" : "text-slate-800"}`}>
                Cart ({selectedTests.length})
              </h2>
              {isUrgent && (
                <Badge className="bg-red-500 text-primary-foreground animate-pulse border-0 shadow-sm text-[10px]">
                  <AlertTriangle className="w-3 h-3 mr-1" /> STAT
                </Badge>
              )}
            </div>
            {selectedTests.length > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-lg"
                onClick={() => setValue("tests", [])}>
                Clear All
              </Button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            {selectedTests.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
                  <FlaskConical className="h-8 w-8 text-slate-300" />
                </div>
                <span className="font-bold text-slate-600 text-lg">
                  Cart is Empty
                </span>
                <span className="text-xs font-medium text-center mt-1">
                  Select tests from the catalog.
                </span>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedTests.map((t: CatalogItem, idx: number) => (
                  <div
                    key={`${t.id}-${idx}`}
                    className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between group">
                    <div className="space-y-1">
                      <div className="font-semibold text-sm text-slate-900">
                        {t.name}
                      </div>
                      <div className="flex gap-2 text-[10px] font-semibold text-slate-500">
                        <span>Spl: {t.sampleType?.name || "-"}</span>
                        <span>•</span>
                        <span>TAT: {t.tat || "-"}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-bold text-base text-slate-900">
                        ₹{Number(t.price).toFixed(2)}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                        onClick={() => removeTest(t.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 💳 RIGHT: FINANCIALS & BILLING */}
        <div className="lg:col-span-4 bg-white flex flex-col h-full z-20 relative overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex-none h-14 flex items-center gap-2">
            <Receipt className="h-4 w-4 text-primary" />
            <h3 className="font-bold text-slate-800 text-sm">
              Checkout & Billing
            </h3>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-5 custom-scrollbar">
            {/* Financial Ledger */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase font-bold text-slate-500">
                  Gross Total
                </Label>
                <Input
                  readOnly
                  value={subTotal}
                  className="h-10 bg-slate-50 font-bold text-lg border-slate-200 rounded-xl"
                  tabIndex={-1}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase font-bold text-slate-500">
                  Discount (₹)
                </Label>
                <Input
                  type="number"
                  {...register("discount")}
                  className="h-10 text-rose-600 font-bold text-lg border-slate-200 rounded-xl"
                />
                <div className="flex gap-2 mt-1">
                  <Badge
                    variant="outline"
                    className="text-[9px] px-2 h-5 cursor-pointer hover:bg-slate-100 text-slate-600"
                    onClick={() => applyDiscountPercent(10)}>
                    10%
                  </Badge>
                  <Badge
                    variant="outline"
                    className="text-[9px] px-2 h-5 cursor-pointer hover:bg-slate-100 text-slate-600"
                    onClick={() => applyDiscountPercent(20)}>
                    20%
                  </Badge>
                </div>
              </div>
            </div>

            {/* Total Block */}
            <div className="bg-slate-900 text-primary-foreground rounded-2xl p-4 flex justify-between items-center shadow-lg relative overflow-hidden">
              <div className="absolute -right-2 -top-2 opacity-10">
                <CreditCard className="w-16 h-16" />
              </div>
              <div className="relative z-10 flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-300">
                  Net Payable
                </span>
                <span className="font-black text-3xl mt-0.5">
                  ₹{netPayable.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Payment & Mode */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase font-bold text-slate-500">
                  Paid Today
                </Label>
                <Input
                  type="number"
                  {...register("paidAmount")}
                  className="h-10 border-emerald-300 bg-emerald-50 text-primary font-bold text-lg rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase font-bold text-slate-500">
                  Pay Mode
                </Label>
                <Select
                  onValueChange={(v) =>
                    setValue("paymentMode", v as any, { shouldValidate: true })
                  }
                  value={paymentMode}>
                  <SelectTrigger className="h-10 text-xs font-bold border-slate-200 rounded-xl">
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

            <div className="flex justify-between items-center text-sm font-bold border-t border-slate-100 pt-4">
              <span className="text-slate-500">Balance Due</span>
              <span
                className={
                  balance > 0
                    ? "text-rose-600 text-lg font-black"
                    : "text-primary text-lg font-black"
                }>
                ₹ {balance}
              </span>
            </div>

            {/* Logistics & Meta */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase font-bold text-slate-500">
                  Collector / Phleb.
                </Label>
                <div className="relative">
                  <UserCheck className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    {...register("collectedBy")}
                    className="h-10 pl-9 text-sm border-slate-200 bg-slate-50 rounded-xl"
                    placeholder="Staff Name..."
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex items-center space-x-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 flex-1">
                  <Checkbox
                    id="slip"
                    checked={watch("printSlip")}
                    onCheckedChange={(v) => setValue("printSlip", !!v)}
                    className="w-4 h-4 rounded-[4px]"
                  />
                  <label
                    htmlFor="slip"
                    className="text-xs font-bold text-slate-700 cursor-pointer">
                    Print Slip
                  </label>
                </div>
                <div className="flex items-center space-x-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 flex-1">
                  <Checkbox
                    id="barcode"
                    checked={watch("printBarcode")}
                    onCheckedChange={(v) => setValue("printBarcode", !!v)}
                    className="w-4 h-4 rounded-[4px]"
                  />
                  <label
                    htmlFor="barcode"
                    className="text-xs font-bold text-slate-700 cursor-pointer">
                    Barcodes
                  </label>
                </div>
              </div>

              <div className="flex items-center space-x-2 bg-rose-50 p-2.5 rounded-xl border border-rose-200 w-full">
                <Checkbox
                  id="urgent"
                  checked={isUrgent}
                  onCheckedChange={(v) =>
                    setValue("isUrgent", !!v, { shouldValidate: true })
                  }
                  className="w-4 h-4 border-rose-400 data-[state=checked]:bg-rose-600"
                />
                <label
                  htmlFor="urgent"
                  className="text-sm text-rose-700 font-bold cursor-pointer select-none">
                  Mark Order as STAT (Urgent)
                </label>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase font-bold text-slate-500">
                  Internal Notes
                </Label>
                <Textarea
                  {...register("note")}
                  placeholder="Clinical history..."
                  className="h-16 text-xs resize-none border-slate-200 rounded-xl bg-slate-50"
                />
              </div>
            </div>
          </div>

          {/* DESKTOP STICKY BOTTOM BAR */}
          <div className="hidden lg:flex p-4 border-t border-slate-200 bg-white flex-none">
            <Button
              type="button"
              variant="outline"
              className="w-1/3 h-12 font-bold text-slate-600 rounded-xl mr-3"
              onClick={() => router.back()}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="accession-form"
              className="w-2/3 h-12 font-bold text-base bg-primary hover:bg-primary/90 rounded-xl shadow-md"
              disabled={submitMutation.isPending || selectedTests.length === 0}>
              {submitMutation.isPending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                "Save & Generate Bill"
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* 📱 MOBILE STICKY BOTTOM ACTION BAR */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 p-3 bg-white border-t border-slate-200 shadow-[0_-10px_30px_-10px_rgba(0,0,0,0.1)] z-50 flex items-center justify-between pb-safe">
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-slate-500 uppercase">
            Total ({selectedTests.length})
          </span>
          <span className="text-xl font-black text-primary">
            ₹{netPayable.toFixed(2)}
          </span>
        </div>
        <Button
          type="submit"
          form="accession-form"
          className="h-12 px-6 font-bold text-sm bg-primary hover:bg-primary/90 rounded-xl shadow-md"
          disabled={submitMutation.isPending || selectedTests.length === 0}>
          {submitMutation.isPending ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            "Save & Bill"
          )}
        </Button>
      </div>
    </form>
  );
}
