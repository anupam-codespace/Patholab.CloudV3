"use client";
export const dynamic = "force-dynamic";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useKeyboardShortcut } from "@/hooks/useKeyboardShortcut";
import {
  Search,
  Plus,
  FileText,
  FlaskConical,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Filter,
  Clock,
  Briefcase,
  Trash2,
  User,
  Phone,
  Fingerprint,
  Stethoscope,
  Hash,
  ScanBarcode,
  SlidersHorizontal,
  FileBadge,
  AlertCircle,
  Receipt,
  MessageCircle,
  Printer,
  FileEdit,
  CheckCircle2,
  Calendar,
  TestTube2,
  MoreHorizontal,
} from "lucide-react";
import { differenceInHours, differenceInMinutes, format } from "date-fns";
import toast from "react-hot-toast";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

const SEARCH_CRITERIA = [
  { id: "all", label: "Global Search", icon: Search },
  { id: "patientId", label: "Patient ID", icon: Fingerprint },
  { id: "name", label: "Patient Name", icon: User },
  { id: "phone", label: "Phone Number", icon: Phone },
  { id: "sampleId", label: "Sample ID", icon: FlaskConical },
  { id: "testName", label: "Test Name", icon: FileText },
  { id: "invoiceId", label: "Bill / Invoice No", icon: Hash },
  { id: "doctor", label: "Referral Doctor", icon: Stethoscope },
  { id: "agency", label: "Agency / Corporate", icon: Briefcase },
  { id: "srfId", label: "SRF ID", icon: FileBadge },
  { id: "abha", label: "ABHA Number", icon: ScanBarcode },
];

const safeFormatDate = (dateValue: string | Date | null | undefined) => {
  if (!dateValue) return "N/A";
  const d = new Date(dateValue);
  if (isNaN(d.getTime())) return "Invalid Date";
  return format(d, "dd MMM yyyy, hh:mm a");
};

const getTAT = (date: Date) => {
  const now = new Date();
  const hours = differenceInHours(now, date);
  const mins = differenceInMinutes(now, date) % 60;

  let colorClass = "text-emerald-700 bg-emerald-50 border-emerald-200";
  if (hours > 24) colorClass = "text-rose-700 bg-rose-50 border-rose-200";
  else if (hours > 12)
    colorClass = "text-amber-700 bg-amber-50 border-amber-200";

  return (
    <div
      className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-md border cursor-help ${colorClass} shadow-sm transition-transform hover:scale-105`}>
      <Clock className="h-3 w-3" /> {hours.toString().padStart(2, "0")}h{" "}
      {mins.toString().padStart(2, "0")}m
    </div>
  );
};

const getTestStatusBadge = (status: string) => {
  switch (status) {
    case "APPROVED":
    case "COMPLETED":
    case "DELIVERED":
      return "text-emerald-700 bg-emerald-50 border-emerald-200";
    case "IN_PROGRESS":
    case "SAMPLE_COLLECTED":
      return "text-amber-700 bg-amber-50 border-amber-200";
    case "PENDING":
    default:
      return "text-muted-foreground bg-muted border-border";
  }
};

export default function PatientWorklistPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [searchField, setSearchField] = useState("all");
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const [activeTabFilter, setActiveTabFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // ⌨️ Keyboard shortcuts
  useKeyboardShortcut("n", () => router.push("/workspace/registration"), { description: "New patient registration" });
  useKeyboardShortcut("/", () => { const el = document.querySelector('input[type="text"]') as HTMLInputElement; el?.focus(); }, { description: "Focus search" });
  useKeyboardShortcut("ArrowRight", () => setPage(p => p + 1), { ctrl: true, description: "Next page" });
  useKeyboardShortcut("ArrowLeft", () => setPage(p => Math.max(1, p - 1)), { ctrl: true, description: "Previous page" });
  useKeyboardShortcut("Escape", () => router.push("/workspace"), { description: "Go back to dashboard" });
  useKeyboardShortcut("r", () => queryClient.invalidateQueries({ queryKey: ["patients"] }), { description: "Refresh patient list" });

  // Search Debounce
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchQuery, searchField]);

  const queryParams = new URLSearchParams({
    page: page.toString(),
    search: debouncedSearch,
    field: searchField,
  }).toString();

  const { data, isLoading } = useQuery({
    queryKey: ["patients", queryParams],
    queryFn: async () => {
      const res = await fetch(`/api/workspace/patients?${queryParams}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    placeholderData: (prev) => prev,
    refetchInterval: 5000,
    staleTime: 0,
  });

  const rawPatients = data?.data || (Array.isArray(data) ? data : []);
  const totalPages = data?.pagination?.pages || 1;

  // 🌟 THE FIX: FLATTEN BY INVOICE (1 Invoice = 1 Row)
  const processedVisits = useMemo(() => {
    const visitsList: any[] = [];

    rawPatients.forEach((patient: any) => {
      // If the patient has invoices, break them out into separate rows
      if (patient.invoices && patient.invoices.length > 0) {
        patient.invoices.forEach((inv: any) => {
          // Find tests that specifically belong to this invoice
          const invoiceTests =
            patient.tests?.filter((t: any) => t.invoiceId === inv.id) || [];

          // Compute status based on THIS specific invoice's tests
          const isFullyApproved =
            invoiceTests.length > 0 &&
            invoiceTests.every(
              (t: any) =>
                t.status === "COMPLETED" ||
                t.status === "APPROVED" ||
                t.status === "DELIVERED",
            );
          const visitComputedStatus = isFullyApproved
            ? "COMPLETED"
            : invoiceTests.length === 0
              ? "NO_TESTS"
              : "PENDING";

          visitsList.push({
            uniqueVisitKey: inv.id, // The unique row ID is the Invoice ID!
            patient: patient,
            invoice: inv,
            visitId: inv.invoiceNumber, // Human readable ID for the UI
            date: new Date(inv.createdAt),
            status: visitComputedStatus,
            tests: invoiceTests,
          });
        });
      }
      // If they were registered but NEVER billed (No invoices at all)
      else {
        visitsList.push({
          uniqueVisitKey: `NO-INV-${patient.id}`,
          patient: patient,
          invoice: null,
          visitId: `REG-${patient.patientId.replace("P-", "")}`,
          date: new Date(patient.createdAt),
          status: "NO_TESTS",
          tests: patient.tests || [],
        });
      }
    });

    // Sort all rows globally by date (Newest first)
    return visitsList.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [rawPatients]);

  // Tab Filtering logic
  const filteredVisits = useMemo(() => {
    if (activeTabFilter === "ALL") return processedVisits;
    return processedVisits.filter((visit) => visit.status === activeTabFilter);
  }, [processedVisits, activeTabFilter]);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/workspace/patients/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete failed");
    },
    onSuccess: () => {
      toast.success("Patient record removed");
      queryClient.invalidateQueries({ queryKey: ["patients"] });
    },
    onError: () => toast.error("Failed to delete record"),
  });

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to purge this entire patient record?")) {
      deleteMutation.mutate(id);
    }
  };

  const ActiveIcon =
    SEARCH_CRITERIA.find((c) => c.id === searchField)?.icon || Search;
  const activeLabel =
    SEARCH_CRITERIA.find((c) => c.id === searchField)?.label || "Global Search";

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-muted/30 font-sans relative overflow-hidden selection:bg-indigo-100">
      <div className="absolute top-0 inset-x-0 h-64 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-100/40 via-slate-50 to-transparent pointer-events-none z-0" />

      <div className="flex-1 flex flex-col p-4 sm:p-6 z-10 overflow-hidden max-w-[1600px] mx-auto w-full">
        {/* --- CONTROL BAR PACKET --- */}
        <div className="flex-none mb-4 flex flex-col gap-4 bg-card/70 backdrop-blur-xl p-4 rounded-2xl border border-slate-200/60 shadow-sm">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-4 w-full sm:w-auto">
              <div className="h-10 w-10 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center shadow-inner shrink-0">
                <FlaskConical className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground tracking-tight flex items-center gap-2 leading-none">
                  Patient Visit Worklist
                  <Badge
                    variant="secondary"
                    className="bg-indigo-50 text-indigo-700 font-mono text-xs">
                    {filteredVisits.length} Records
                  </Badge>
                </h1>
                <p className="text-xs font-medium text-muted-foreground mt-1">
                  Click any row to open the full patient profile.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <Popover open={isSearchOpen} onOpenChange={setIsSearchOpen}>
                <PopoverTrigger asChild>
                  <div className="relative w-full sm:w-72 group cursor-pointer">
                    <div className="absolute left-3 top-2.5 text-muted-foreground/70 group-hover:text-indigo-600 transition-colors">
                      <ActiveIcon className="h-4 w-4" />
                    </div>
                    <Input
                      placeholder={`Search by ${activeLabel}...`}
                      className="pl-9 pr-9 h-10 bg-card border-border focus:border-indigo-500 rounded-xl cursor-pointer font-medium shadow-sm"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <div className="absolute right-3 top-2.5 text-slate-300 group-hover:text-indigo-400">
                      <SlidersHorizontal className="h-4 w-4" />
                    </div>
                  </div>
                </PopoverTrigger>
                <PopoverContent
                  className="w-80 p-0 shadow-2xl border-slate-100 rounded-2xl overflow-hidden"
                  align="end"
                  sideOffset={8}>
                  <div className="bg-slate-50/80 p-4 border-b border-slate-100">
                    <div className="relative">
                      <Input
                        autoFocus
                        placeholder="Filter criteria fields..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="h-10 bg-card pl-9 rounded-xl focus:border-indigo-500"
                      />
                      <ActiveIcon className="absolute left-3 top-3 h-4 w-4 text-indigo-500" />
                    </div>
                  </div>
                  <div className="p-2 max-h-[300px] overflow-y-auto">
                    <RadioGroup
                      value={searchField}
                      onValueChange={(val) => {
                        setSearchField(val);
                        setIsSearchOpen(false);
                      }}>
                      <div className="grid grid-cols-2 gap-1">
                        {SEARCH_CRITERIA.map((criteria) => (
                          <div key={criteria.id}>
                            <RadioGroupItem
                              value={criteria.id}
                              id={criteria.id}
                              className="peer sr-only"
                            />
                            <Label
                              htmlFor={criteria.id}
                              className="flex items-center gap-2 px-3 py-2 rounded-xl border border-transparent cursor-pointer hover:bg-muted/30 peer-data-[state=checked]:bg-indigo-50 peer-data-[state=checked]:text-indigo-700 transition-all text-xs font-semibold">
                              <criteria.icon className="h-3.5 w-3.5 opacity-75" />
                              {criteria.label}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </RadioGroup>
                  </div>
                </PopoverContent>
              </Popover>

              <Button
                onClick={() => router.push("/workspace/registration")}
                className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white h-10 rounded-xl text-sm font-bold shadow-md shadow-indigo-500/25 transition-all hover:-translate-y-0.5">
                <Plus className="h-4 w-4 mr-1.5" /> New Registration
              </Button>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-3">
            <Tabs
              value={activeTabFilter}
              onValueChange={setActiveTabFilter}
              className="w-full">
              <TabsList className="bg-slate-100/80 p-1 rounded-xl flex justify-start gap-1 w-full sm:w-max overflow-x-auto">
                <TabsTrigger
                  value="ALL"
                  className="rounded-lg text-xs font-bold px-4 py-2 data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm">
                  All Visits ({processedVisits.length})
                </TabsTrigger>
                <TabsTrigger
                  value="COMPLETED"
                  className="rounded-lg text-xs font-bold px-4 py-2 data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-sm flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Print Ready
                </TabsTrigger>
                <TabsTrigger
                  value="PENDING"
                  className="rounded-lg text-xs font-bold px-4 py-2 data-[state=active]:bg-amber-500 data-[state=active]:text-white data-[state=active]:shadow-sm flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" /> Entry Pending
                </TabsTrigger>
                <TabsTrigger
                  value="NO_TESTS"
                  className="rounded-lg text-xs font-bold px-4 py-2 data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-sm flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5" /> Reg. Only
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* --- GRID MASTER TABLE --- */}
        <Card className="flex-1 flex flex-col shadow-sm border-slate-200/80 overflow-hidden rounded-2xl bg-card">
          <TooltipProvider delayDuration={300}>
            <div className="flex-1 overflow-auto relative custom-scrollbar">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead className="sticky top-0 z-20 bg-slate-50/90 backdrop-blur-md text-muted-foreground font-bold uppercase tracking-wider text-[10px] border-b border-border">
                  <tr>
                    <th className="px-4 py-3 w-[150px]">Visit ID</th>
                    <th className="px-4 py-3 w-[350px]">
                      Patient Profile & Demographics
                    </th>
                    <th className="px-4 py-3 w-[120px]">TAT Analytics</th>
                    <th className="px-4 py-3 min-w-[200px]">Assigned Assays</th>
                    <th className="px-4 py-3 w-[160px]">Referred By</th>
                    <th className="px-4 py-3 text-center w-[100px]">
                      Financials
                    </th>
                    <th className="px-5 py-3 text-right w-[80px]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className="h-64 text-center">
                        <div className="flex flex-col items-center justify-center text-muted-foreground space-y-2">
                          <Loader2 className="animate-spin h-6 w-6 text-indigo-600" />
                          <span className="text-[10px] uppercase tracking-widest font-bold animate-pulse">
                            Loading Visits...
                          </span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredVisits.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="h-64 text-center">
                        <div className="flex flex-col items-center justify-center text-muted-foreground/70 space-y-2">
                          <Search className="h-6 w-6 text-slate-300" />
                          <p className="font-bold text-xs text-muted-foreground">
                            Zero visits found
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredVisits.map((visit: any) => {
                      const isRowSelected = selectedIds.includes(
                        visit.uniqueVisitKey,
                      );

                      let derivedDoctor =
                        visit.tests?.[0]?.doctor?.name ||
                        visit.patient.doctor?.name ||
                        "Self Referral";
                      let derivedAgency =
                        visit.tests?.[0]?.agency?.agencyName ||
                        visit.patient.agency?.agencyName ||
                        null;

                      return (
                        <tr
                          key={visit.uniqueVisitKey}
                          onClick={() =>
                            router.push(
                              `/workspace/patients/${visit.patient.id}`,
                            )
                          }
                          className={`group transition-all cursor-pointer ${isRowSelected ? "bg-indigo-50/30" : "hover:bg-muted/50/70"}`}>
                          {/* 🆔 DYNAMIC VISIT TRACKER ID */}
                          <td className="px-4 py-4">
                            <div className="flex flex-col gap-1 w-max">
                              <Badge
                                variant="outline"
                                className="font-mono bg-indigo-50/50 font-black text-indigo-700 border-indigo-100 text-[11px] px-2 py-0.5 rounded-md shadow-sm">
                                {visit.visitId}
                              </Badge>
                              <span className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-wide flex items-center gap-1 pl-0.5 mt-0.5">
                                <Calendar className="w-3 h-3 text-slate-300" />{" "}
                                {safeFormatDate(visit.date)}
                              </span>
                            </div>
                          </td>

                          {/* 👤 INLINE PATIENT DEMOGRAPHICS */}
                          <td className="px-4 py-4">
                            <div className="flex flex-col gap-1 w-max">
                              <div className="flex items-center gap-2">
                                <span className="font-extrabold text-foreground text-sm tracking-tight">
                                  {visit.patient.name}
                                </span>
                                <Badge className="bg-muted text-muted-foreground hover:bg-slate-200 border-none px-1.5 py-0 text-[9px] uppercase tracking-wider font-bold">
                                  {visit.patient.age}{" "}
                                  {visit.patient.ageUnit?.slice(0, 1)} •{" "}
                                  {visit.patient.gender}
                                </Badge>
                                <span className="text-[10px] font-mono font-bold text-muted-foreground/70 ml-1">
                                  {visit.patient.patientId}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                                  <Phone className="w-3 h-3 text-slate-400" />{" "}
                                  {visit.patient.phone}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* ⏱️ REAL TIME LOGISTICS TAT ANALYTICS */}
                          <td className="px-4 py-4">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div>{getTAT(visit.date)}</div>
                              </TooltipTrigger>
                              <TooltipContent className="bg-slate-900 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-xl">
                                Registered:{" "}
                                {format(
                                  new Date(visit.date),
                                  "dd MMM, hh:mm a",
                                )}
                              </TooltipContent>
                            </Tooltip>
                          </td>

                          {/* 🧪 TESTING PARCELS */}
                          <td className="px-4 py-4">
                            <div className="flex flex-wrap gap-1 max-w-[280px]">
                              {visit.tests.map((testItem: any) => (
                                <Tooltip key={testItem.id}>
                                  <TooltipTrigger asChild>
                                    <div
                                      className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold border cursor-help transition-all hover:scale-105 ${getTestStatusBadge(testItem.status)}`}>
                                      <span>{testItem.testCode}</span>
                                      {testItem.status === "COMPLETED" ||
                                      testItem.status === "APPROVED" ? (
                                        <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                                      ) : (
                                        <Clock className="w-2.5 h-2.5 opacity-70" />
                                      )}
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent className="bg-slate-900 text-slate-50 text-xs rounded-xl p-3 shadow-xl border-slate-800 z-50">
                                    <p className="font-bold text-sm mb-1">
                                      {testItem.testName}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground/70 uppercase tracking-wider">
                                      Status:{" "}
                                      <span className="text-white font-bold">
                                        {testItem.status}
                                      </span>
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              ))}
                              {visit.tests.length === 0 && (
                                <span className="text-muted-foreground/70 text-xs italic font-semibold flex items-center gap-1">
                                  <AlertCircle className="w-3.5 h-3.5" /> No
                                  Tests Billed
                                </span>
                              )}
                            </div>
                          </td>

                          {/* 🩺 REFERRED BY COLUMN */}
                          <td className="px-4 py-4">
                            <div className="flex flex-col gap-0.5 text-xs">
                              <span className="font-bold text-foreground/80 flex items-center gap-1.5 truncate max-w-[140px]">
                                <Stethoscope className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0" />
                                {derivedDoctor}
                              </span>
                              {derivedAgency && (
                                <span className="text-[9px] font-black text-muted-foreground/70 uppercase tracking-widest flex items-center gap-1.5 truncate max-w-[140px]">
                                  <Briefcase className="h-3 w-3 text-slate-300 shrink-0" />
                                  {derivedAgency}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* 💰 FINANCIALS */}
                          <td
                            className="px-4 py-4 text-center"
                            onClick={(e) => e.stopPropagation()}>
                            {visit.invoice ? (
                              <HoverCard openDelay={200}>
                                <HoverCardTrigger asChild>
                                  <div className="w-max mx-auto">
                                    <Badge
                                      className={`${visit.invoice.status === "PAID" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"} border-none text-[10px] px-2.5 uppercase tracking-wider font-bold cursor-help`}>
                                      {visit.invoice.status}
                                    </Badge>
                                  </div>
                                </HoverCardTrigger>
                                <HoverCardContent
                                  className="w-64 p-0 shadow-2xl border-border rounded-xl overflow-hidden z-50"
                                  align="center">
                                  <div className="bg-muted/30 px-4 py-2 border-b text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1.5">
                                    <Receipt className="h-3.5 w-3.5" /> Invoice
                                    Summary
                                  </div>
                                  <div className="p-4 space-y-2 text-xs font-semibold">
                                    <div className="flex justify-between text-muted-foreground">
                                      <span>Subtotal</span>{" "}
                                      <span>
                                        ₹
                                        {Number(
                                          visit.invoice.subtotal || 0,
                                        ).toFixed(2)}
                                      </span>
                                    </div>
                                    <div className="border-t border-dashed pt-2 flex justify-between font-black text-foreground text-sm">
                                      <span>Net Payable</span>{" "}
                                      <span>
                                        ₹
                                        {Number(
                                          visit.invoice.grandTotal || 0,
                                        ).toFixed(2)}
                                      </span>
                                    </div>
                                  </div>
                                </HoverCardContent>
                              </HoverCard>
                            ) : (
                              <Badge
                                variant="outline"
                                className="text-muted-foreground/70 border-dashed text-[10px] uppercase">
                                Unbilled
                              </Badge>
                            )}
                          </td>

                          {/* ⚙️ 3-DOT ACTION MENU */}
                          <td
                            className="px-5 py-4 text-right"
                            onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  className="h-8 w-8 p-0 rounded-lg text-muted-foreground/70 hover:text-indigo-600 hover:bg-indigo-50">
                                  <span className="sr-only">Open menu</span>
                                  <MoreHorizontal className="h-5 w-5" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent
                                align="end"
                                className="w-56 p-1.5 shadow-2xl border-slate-100 rounded-xl">
                                {/* New Accession for THIS patient */}
                                <DropdownMenuItem
                                  onClick={() =>
                                    router.push(
                                      `/workspace/accession?patientId=${visit.patient.id}&isNewVisit=true`,
                                    )
                                  }
                                  className="cursor-pointer font-bold rounded-lg py-2.5">
                                  <TestTube2 className="mr-2 h-4 w-4 text-indigo-500" />{" "}
                                  Add New Test
                                </DropdownMenuItem>

                                {/* Results Entry (Using the Patient ID to fetch their active tests) */}
                                {visit.tests.length > 0 && (
                                  <DropdownMenuItem
                                    onClick={() =>
                                      router.push(
                                        `/workspace/workflow/results/${visit.patient.id}`,
                                      )
                                    }
                                    className="cursor-pointer font-bold rounded-lg py-2.5">
                                    <FileEdit className="mr-2 h-4 w-4 text-amber-600" />{" "}
                                    Enter Results Data
                                  </DropdownMenuItem>
                                )}

                                {/* Print Report (Using Patient ID) */}
                                {visit.status === "COMPLETED" && (
                                  <DropdownMenuItem
                                    onClick={() =>
                                      router.push(
                                        `/workspace/reports/print/${visit.patient.id}`,
                                      )
                                    }
                                    className="cursor-pointer font-bold rounded-lg py-2.5">
                                    <Printer className="mr-2 h-4 w-4 text-emerald-600" />{" "}
                                    Print Final Report
                                  </DropdownMenuItem>
                                )}

                                <DropdownMenuSeparator className="bg-muted my-1" />

                                {/* Invoice Actions (Using specific Invoice ID!) */}
                                {visit.invoice && (
                                  <>
                                    <DropdownMenuItem
                                      onClick={() =>
                                        router.push(
                                          `/workspace/billing/${visit.invoice.id}`,
                                        )
                                      }
                                      className="cursor-pointer font-medium text-foreground/80 rounded-lg py-2">
                                      <Receipt className="mr-2 h-4 w-4 text-slate-400" />{" "}
                                      View Invoice
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() =>
                                        router.push(
                                          `/workspace/print/barcodes?invoiceId=${visit.invoice.id}`,
                                        )
                                      }
                                      className="cursor-pointer font-medium text-foreground/80 rounded-lg py-2">
                                      <ScanBarcode className="mr-2 h-4 w-4 text-slate-400" />{" "}
                                      Print Barcodes
                                    </DropdownMenuItem>
                                  </>
                                )}

                                <DropdownMenuSeparator className="bg-muted my-1" />
                                <DropdownMenuItem
                                  className="text-rose-600 focus:text-rose-700 focus:bg-rose-50 font-bold rounded-lg py-2"
                                  onClick={() =>
                                    handleDelete(visit.patient.id)
                                  }>
                                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                                  Record
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </TooltipProvider>

          {/* --- PAGINATION CONSOLE FOOTER --- */}
          <div className="flex-none px-6 py-4 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-card z-20">
            <div className="text-xs text-muted-foreground font-bold tracking-wide uppercase">
              Page <span className="text-foreground font-black">{page}</span> /{" "}
              <span className="text-foreground font-black">{totalPages}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="h-9 px-4 rounded-xl text-xs font-black border-border text-muted-foreground hover:bg-muted/30">
                <ChevronLeft className="h-4 w-4 mr-1" /> Prev
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= totalPages}
                className="h-9 px-4 rounded-xl text-xs font-black border-border text-muted-foreground hover:bg-muted/30">
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
