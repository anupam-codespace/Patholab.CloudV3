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
  ChevronDown,
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
  { id: "all", label: "GLOBAL SEARCH", icon: Search },
  { id: "patientId", label: "PATIENT ID", icon: Fingerprint },
  { id: "name", label: "PATIENT NAME", icon: User },
  { id: "phone", label: "PHONE NUMBER", icon: Phone },
  { id: "sampleId", label: "SAMPLE ID", icon: FlaskConical },
  { id: "testName", label: "TEST NAME", icon: FileText },
  { id: "invoiceId", label: "BILL / INVOICE NO", icon: Hash },
  { id: "doctor", label: "REFERRAL DOCTOR", icon: Stethoscope },
  { id: "agency", label: "AGENCY / CORPORATE", icon: Briefcase },
  { id: "srfId", label: "SRF ID", icon: FileBadge },
  { id: "abha", label: "ABHA NUMBER", icon: ScanBarcode },
];

const safeFormatDate = (dateValue: string | Date | null | undefined) => {
  if (!dateValue) return "N/A";
  const d = new Date(dateValue);
  if (isNaN(d.getTime())) return "INVALID DATE";
  return format(d, "dd MMM yyyy, hh:mm a").toUpperCase();
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
      className={`inline-flex items-center gap-1.5 text-[10px] font-normal uppercase px-1.5 py-0.5 rounded border cursor-help ${colorClass} shadow-sm transition-transform hover:scale-105`}>
      <Clock className="h-3 w-3" /> {hours.toString().padStart(2, "0")}H{" "}
      {mins.toString().padStart(2, "0")}M
    </div>
  );
};

const getTestStatusBadge = (status: string) => {
  switch (status) {
    case "APPROVED":
    case "COMPLETED":
    case "DELIVERED":
      return "text-emerald-700 bg-emerald-50 border-emerald-200";
    case "RESULT_ENTERED":
    case "IN_PROGRESS":
    case "SAMPLE_COLLECTED":
      return "text-amber-700 bg-amber-50 border-amber-200";
    case "PENDING":
    default:
      return "text-muted-foreground bg-muted border-border hover:bg-slate-200";
  }
};

const getTestDetailedStatus = (status: string) => {
  switch (status) {
    case "COMPLETED":
    case "DELIVERED":
      return "READY TO PRINT";
    case "APPROVED":
      return "APPROVED BY DR";
    case "RESULT_ENTERED":
      return "RESULT ENTERED";
    case "IN_PROGRESS":
      return "PROCESSING";
    case "SAMPLE_COLLECTED":
      return "SAMPLE COLLECTED";
    case "PENDING":
      return "PENDING";
    default:
      return status.replace("_", " ").toUpperCase();
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
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  // ⌨️ Keyboard shortcuts
  useKeyboardShortcut("n", () => router.push("/workspace/registration"), {
    description: "New patient registration",
  });
  useKeyboardShortcut(
    "/",
    () => {
      const el = document.querySelector(
        'input[type="text"]',
      ) as HTMLInputElement;
      el?.focus();
    },
    { description: "Focus search" },
  );
  useKeyboardShortcut("ArrowRight", () => setPage((p) => p + 1), {
    ctrl: true,
    description: "Next page",
  });
  useKeyboardShortcut("ArrowLeft", () => setPage((p) => Math.max(1, p - 1)), {
    ctrl: true,
    description: "Previous page",
  });
  useKeyboardShortcut("Escape", () => router.push("/workspace"), {
    description: "Go back to dashboard",
  });
  useKeyboardShortcut(
    "r",
    () => queryClient.invalidateQueries({ queryKey: ["patients"] }),
    { description: "Refresh patient list" },
  );

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

  const processedVisits = useMemo(() => {
    const visitsList: any[] = [];

    rawPatients.forEach((patient: any) => {
      if (patient.invoices && patient.invoices.length > 0) {
        patient.invoices.forEach((inv: any) => {
          const invoiceTests =
            patient.tests?.filter((t: any) => t.invoiceId === inv.id) || [];

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
            uniqueVisitKey: inv.id,
            patient: patient,
            invoice: inv,
            visitId: inv.invoiceNumber,
            date: new Date(inv.createdAt),
            status: visitComputedStatus,
            tests: invoiceTests,
          });
        });
      } else {
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

    return visitsList.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [rawPatients]);

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
    if (confirm("ARE YOU SURE YOU WANT TO PURGE THIS ENTIRE PATIENT RECORD?")) {
      deleteMutation.mutate(id);
    }
  };

  const toggleRowExpansion = (key: string) => {
    setExpandedRows((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const ActiveIcon =
    SEARCH_CRITERIA.find((c) => c.id === searchField)?.icon || Search;
  const activeLabel =
    SEARCH_CRITERIA.find((c) => c.id === searchField)?.label || "GLOBAL SEARCH";

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-muted/30 font-sans relative overflow-hidden selection:bg-indigo-100 uppercase">
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
                <h1 className="text-lg font-normal text-foreground tracking-tight flex items-center gap-2 leading-none">
                  PATIENT VISIT WORKLIST
                  <Badge
                    variant="secondary"
                    className="bg-indigo-50 text-indigo-700 font-mono font-normal text-[10px]">
                    {filteredVisits.length} RECORDS
                  </Badge>
                </h1>
                <p className="text-[10px] font-normal text-muted-foreground mt-1">
                  CLICK ANY ROW TO EXPAND TEST DETAILS. CLICK PATIENT ID TO OPEN
                  PROFILE.
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
                      placeholder={`SEARCH BY ${activeLabel}...`}
                      className="pl-9 pr-9 h-10 bg-card border-border focus:border-indigo-500 rounded-xl cursor-pointer font-normal text-xs shadow-sm uppercase placeholder:uppercase"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <div className="absolute right-3 top-2.5 text-slate-300 group-hover:text-indigo-400">
                      <SlidersHorizontal className="h-4 w-4" />
                    </div>
                  </div>
                </PopoverTrigger>
                <PopoverContent
                  className="w-80 p-0 shadow-2xl border-slate-100 rounded-2xl overflow-hidden uppercase"
                  align="end"
                  sideOffset={8}>
                  <div className="bg-slate-50/80 p-4 border-b border-slate-100">
                    <div className="relative">
                      <Input
                        autoFocus
                        placeholder="FILTER CRITERIA FIELDS..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="h-10 bg-card pl-9 rounded-xl focus:border-indigo-500 uppercase font-normal text-xs placeholder:uppercase"
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
                              className="flex items-center gap-2 px-3 py-2 rounded-xl border border-transparent cursor-pointer hover:bg-muted/30 peer-data-[state=checked]:bg-indigo-50 peer-data-[state=checked]:text-indigo-700 transition-all text-[10px] font-normal uppercase">
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
                className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white h-10 rounded-xl text-xs font-normal shadow-md shadow-indigo-500/25 transition-all hover:-translate-y-0.5 uppercase">
                <Plus className="h-4 w-4 mr-1.5" /> NEW REGISTRATION ("N")
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
                  className="rounded-lg text-[10px] font-normal px-4 py-2 uppercase data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm">
                  ALL VISITS ({processedVisits.length})
                </TabsTrigger>
                <TabsTrigger
                  value="COMPLETED"
                  className="rounded-lg text-[10px] font-normal px-4 py-2 uppercase data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-sm flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5" /> PRINT READY
                </TabsTrigger>
                <TabsTrigger
                  value="PENDING"
                  className="rounded-lg text-[10px] font-normal px-4 py-2 uppercase data-[state=active]:bg-amber-500 data-[state=active]:text-white data-[state=active]:shadow-sm flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" /> ENTRY PENDING
                </TabsTrigger>
                <TabsTrigger
                  value="NO_TESTS"
                  className="rounded-lg text-[10px] font-normal px-4 py-2 uppercase data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-sm flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5" /> REG. ONLY
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
                <thead className="sticky top-0 z-20 bg-slate-50/90 backdrop-blur-md text-muted-foreground font-normal uppercase tracking-wider text-[10px] border-b border-border">
                  <tr>
                    <th className="px-4 py-3 w-[160px]">VISIT ID</th>
                    <th className="px-4 py-3 w-[340px]">
                      PATIENT DEMOGRAPHICS
                    </th>
                    <th className="px-4 py-3 w-[120px]">TAT LOGISTICS</th>
                    <th className="px-4 py-3 min-w-[220px]">
                      ASSIGNED ASSAYS & STATUS
                    </th>
                    <th className="px-4 py-3 w-[160px]">REFERRED BY</th>
                    <th className="px-4 py-3 text-center w-[100px]">
                      FINANCIALS
                    </th>
                    <th className="px-4 py-3 text-right w-[150px]">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-normal uppercase tracking-wide">
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className="h-64 text-center">
                        <div className="flex flex-col items-center justify-center text-muted-foreground space-y-2">
                          <Loader2 className="animate-spin h-6 w-6 text-indigo-600" />
                          <span className="text-[10px] uppercase tracking-widest font-normal animate-pulse">
                            LOADING VISITS...
                          </span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredVisits.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="h-64 text-center">
                        <div className="flex flex-col items-center justify-center text-muted-foreground/70 space-y-2">
                          <Search className="h-6 w-6 text-slate-300" />
                          <p className="font-normal text-[10px] uppercase text-muted-foreground">
                            ZERO VISITS FOUND
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredVisits.map((visit: any) => {
                      const isExpanded = expandedRows[visit.uniqueVisitKey];

                      let derivedDoctor =
                        visit.tests?.[0]?.doctor?.name ||
                        visit.patient.doctor?.name ||
                        "SELF REFERRAL";
                      let derivedAgency =
                        visit.tests?.[0]?.agency?.agencyName ||
                        visit.patient.agency?.agencyName ||
                        null;

                      return (
                        <tr
                          key={visit.uniqueVisitKey}
                          onClick={() =>
                            toggleRowExpansion(visit.uniqueVisitKey)
                          }
                          className={`group transition-all cursor-pointer ${isExpanded ? "bg-indigo-50/20" : "hover:bg-muted/50/70"}`}>
                          {/* 🆔 DYNAMIC VISIT TRACKER ID */}
                          <td className="px-4 py-3 align-top">
                            <div className="flex items-start gap-2 w-max">
                              <div
                                className={`mt-0.5 text-slate-300 transition-transform ${isExpanded ? "rotate-180" : "rotate-0"}`}>
                                <ChevronDown className="w-4 h-4" />
                              </div>
                              <div className="flex flex-col gap-1">
                                <Badge
                                  variant="outline"
                                  className="font-mono bg-indigo-50/50 font-normal text-indigo-700 border-indigo-100 text-[11px] px-2 py-0.5 rounded shadow-sm uppercase">
                                  {visit.visitId}
                                </Badge>
                                <span className="text-[9px] font-normal text-muted-foreground/70 flex items-center gap-1 pl-0.5">
                                  <Calendar className="w-2.5 h-2.5 text-slate-300" />{" "}
                                  {safeFormatDate(visit.date)}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* 👤 INLINE PATIENT DEMOGRAPHICS (CLICKABLE ID) */}
                          <td className="px-4 py-3 align-top">
                            <div className="flex flex-col gap-1 w-max">
                              <div className="flex items-center gap-2">
                                <span className="font-normal text-foreground text-sm tracking-tight">
                                  {visit.patient.name}
                                </span>
                                <Badge className="bg-muted text-muted-foreground border-none px-1.5 py-0 text-[9px] font-normal uppercase">
                                  {visit.patient.age}{" "}
                                  {visit.patient.ageUnit?.slice(0, 1)} •{" "}
                                  {visit.patient.gender}
                                </Badge>
                                {/* LARGER CLICKABLE PATIENT ID */}
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        router.push(
                                          `/workspace/patients/${visit.patient.id}`,
                                        );
                                      }}
                                      className="text-sm font-mono font-normal text-indigo-600 bg-indigo-50/50 px-1.5 rounded cursor-pointer hover:bg-indigo-100 hover:underline transition-all">
                                      {visit.patient.patientId}
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent className="bg-slate-900 text-white font-normal text-[10px] uppercase">
                                    OPEN PATIENT PROFILE
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-normal text-muted-foreground flex items-center gap-1">
                                  <Phone className="w-2.5 h-2.5 text-slate-400" />{" "}
                                  {visit.patient.phone}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* ⏱️ REAL TIME LOGISTICS TAT ANALYTICS */}
                          <td className="px-4 py-3 align-top">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div>{getTAT(visit.date)}</div>
                              </TooltipTrigger>
                              <TooltipContent className="bg-slate-900 text-white text-[10px] font-normal uppercase px-3 py-1.5 rounded-lg shadow-xl">
                                REGISTERED:{" "}
                                {format(
                                  new Date(visit.date),
                                  "dd MMM, hh:mm a",
                                ).toUpperCase()}
                              </TooltipContent>
                            </Tooltip>
                          </td>

                          {/* 🧪 TESTING PARCELS (COLLAPSED / EXPANDED STATE) */}
                          <td className="px-4 py-3 align-top">
                            {/* STATE 1: COLLAPSED (Short Codes) */}
                            {!isExpanded && (
                              <div className="flex flex-wrap gap-1 max-w-[280px]">
                                {visit.tests.map((testItem: any) => (
                                  <div
                                    key={testItem.id}
                                    className={`px-1.5 py-0.5 rounded text-[9px] font-normal uppercase border ${getTestStatusBadge(testItem.status)}`}>
                                    {testItem.testCode}
                                  </div>
                                ))}
                                {visit.tests.length === 0 && (
                                  <span className="text-muted-foreground/70 text-[10px] font-normal flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" /> NO TESTS
                                    BILLED
                                  </span>
                                )}
                              </div>
                            )}

                            {/* STATE 2: EXPANDED (Line by Line with Details) */}
                            {isExpanded && (
                              <div className="flex flex-col gap-1.5 min-w-[280px] max-w-[340px]">
                                <span className="text-[9px] font-medium text-indigo-500 mb-1 flex items-center gap-1">
                                  <FlaskConical className="w-3 h-3" /> TEST
                                  BREAKDOWN
                                </span>
                                {visit.tests.map((testItem: any) => (
                                  <div
                                    key={testItem.id}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      router.push(
                                        `/workspace/workflow/results/${visit.patient.id}`,
                                      );
                                    }}
                                    className={`flex items-center justify-between gap-3 px-2 py-1.5 rounded text-[10px] font-normal uppercase border cursor-pointer transition-all hover:border-indigo-300 hover:shadow-sm ${getTestStatusBadge(testItem.status)}`}>
                                    <div className="flex flex-col">
                                      <span className="font-semibold tracking-wide">
                                        {testItem.testName}
                                      </span>
                                      <span className="text-[8px] opacity-70">
                                        CODE: {testItem.testCode}
                                      </span>
                                    </div>

                                    <span className="px-1.5 py-0.5 bg-white/80 rounded-[3px] text-[8px] font-bold tracking-wider border border-black/5 shadow-sm whitespace-nowrap">
                                      {getTestDetailedStatus(testItem.status)}
                                    </span>
                                  </div>
                                ))}
                                {visit.tests.length === 0 && (
                                  <span className="text-muted-foreground/70 text-[10px] font-normal flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" /> NO TESTS
                                    BILLED
                                  </span>
                                )}
                              </div>
                            )}
                          </td>

                          {/* 🩺 REFERRED BY COLUMN */}
                          <td className="px-4 py-3 align-top">
                            <div className="flex flex-col gap-1 text-[10px]">
                              <span className="font-normal text-foreground flex items-center gap-1 truncate max-w-[140px]">
                                <Stethoscope className="h-3 w-3 text-muted-foreground/70 shrink-0" />
                                {derivedDoctor}
                              </span>
                              {derivedAgency && (
                                <span className="text-[9px] font-normal text-muted-foreground/70 flex items-center gap-1 truncate max-w-[140px]">
                                  <Briefcase className="h-2.5 w-2.5 text-slate-300 shrink-0" />
                                  {derivedAgency}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* 💰 FINANCIALS */}
                          <td
                            className="px-4 py-3 align-top text-center"
                            onClick={(e) => e.stopPropagation()}>
                            {visit.invoice ? (
                              <HoverCard openDelay={200}>
                                <HoverCardTrigger asChild>
                                  <div className="w-max mx-auto">
                                    <Badge
                                      className={`${visit.invoice.status === "PAID" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"} border-none text-[9px] px-2 py-0.5 uppercase font-normal cursor-help`}>
                                      {visit.invoice.status}
                                    </Badge>
                                  </div>
                                </HoverCardTrigger>
                                <HoverCardContent
                                  className="w-64 p-0 shadow-2xl border-border rounded-xl overflow-hidden z-50 uppercase font-normal"
                                  align="center">
                                  <div className="bg-muted/30 px-4 py-2 border-b text-[10px] text-muted-foreground flex items-center gap-1.5">
                                    <Receipt className="h-3.5 w-3.5" /> INVOICE
                                    SUMMARY
                                  </div>
                                  <div className="p-4 space-y-2 text-[11px]">
                                    <div className="flex justify-between text-muted-foreground">
                                      <span>SUBTOTAL</span>{" "}
                                      <span>
                                        ₹
                                        {Number(
                                          visit.invoice.subtotal || 0,
                                        ).toFixed(2)}
                                      </span>
                                    </div>
                                    <div className="border-t border-dashed pt-2 flex justify-between text-foreground text-xs font-semibold">
                                      <span>NET PAYABLE</span>{" "}
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
                                className="text-muted-foreground/70 border-dashed text-[9px] font-normal uppercase">
                                UNBILLED
                              </Badge>
                            )}
                          </td>

                          {/* ⚙️ ACTION MENU WITH INLINE HORIZONTAL ACTIONS */}
                          <td
                            className="px-4 py-3 align-top text-right"
                            onClick={(e) => e.stopPropagation()}>
                            <div className="flex flex-row items-center justify-end gap-2">
                              {/* INLINE LABELED ACTION: PRINT REPORT */}
                              {visit.status === "COMPLETED" && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    router.push(
                                      `/workspace/reports/print/${visit.patient.id}`,
                                    );
                                  }}
                                  className="h-8 px-3 border-emerald-200 bg-emerald-50/50 text-emerald-700 hover:bg-emerald-100 hover:border-emerald-300 rounded shadow-sm flex items-center gap-1.5 transition-all">
                                  <Printer className="h-3.5 w-3.5 shrink-0" />
                                  <span className="text-[10px] font-bold tracking-wider">
                                    PRINT
                                  </span>
                                </Button>
                              )}

                              {/* STANDARD DROPDOWN MENU FOR EVERYTHING ELSE */}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 px-3 rounded text-muted-foreground/70 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 transition-all flex items-center gap-1.5 shadow-sm">
                                    <span className="text-[10px] font-bold tracking-wider">
                                      MORE
                                    </span>
                                    <ChevronDown className="h-3.5 w-3.5 shrink-0" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                  align="end"
                                  className="w-56 p-1.5 shadow-2xl border-slate-100 rounded-xl uppercase font-normal text-xs">
                                  {visit.tests.length > 0 && (
                                    <DropdownMenuItem
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        router.push(
                                          `/workspace/workflow/results/${visit.patient.id}`,
                                        );
                                      }}
                                      className="cursor-pointer rounded-lg py-2.5 font-medium text-amber-700 hover:text-amber-800 hover:bg-amber-50">
                                      <FileEdit className="mr-2 h-4 w-4" />{" "}
                                      ENTER RESULTS
                                    </DropdownMenuItem>
                                  )}

                                  <DropdownMenuItem
                                    onClick={() =>
                                      router.push(
                                        `/workspace/accession?patientId=${visit.patient.id}&isNewVisit=true`,
                                      )
                                    }
                                    className="cursor-pointer rounded-lg py-2.5 font-medium text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50">
                                    <TestTube2 className="mr-2 h-4 w-4" /> ADD
                                    NEW TEST
                                  </DropdownMenuItem>

                                  <DropdownMenuSeparator className="bg-muted my-1" />

                                  {visit.invoice && (
                                    <>
                                      <DropdownMenuItem
                                        onClick={() =>
                                          router.push(
                                            `/workspace/billing/${visit.invoice.id}`,
                                          )
                                        }
                                        className="cursor-pointer text-foreground/80 rounded-lg py-2 font-medium hover:bg-slate-100">
                                        <Receipt className="mr-2 h-4 w-4 text-slate-400" />{" "}
                                        VIEW INVOICE
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() =>
                                          router.push(
                                            `/workspace/print/barcodes?invoiceId=${visit.invoice.id}`,
                                          )
                                        }
                                        className="cursor-pointer text-foreground/80 rounded-lg py-2 font-medium hover:bg-slate-100">
                                        <ScanBarcode className="mr-2 h-4 w-4 text-slate-400" />{" "}
                                        PRINT BARCODES
                                      </DropdownMenuItem>
                                    </>
                                  )}

                                  <DropdownMenuSeparator className="bg-muted my-1" />

                                  <DropdownMenuItem
                                    className="text-rose-600 focus:text-rose-700 focus:bg-rose-50 rounded-lg py-2 font-medium"
                                    onClick={() =>
                                      handleDelete(visit.patient.id)
                                    }>
                                    <Trash2 className="mr-2 h-4 w-4" /> DELETE
                                    RECORD
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
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
          <div className="flex-none px-6 py-3 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-card z-20 uppercase font-normal">
            <div className="text-[10px] text-muted-foreground tracking-wide font-medium">
              PAGE <span className="text-foreground">{page}</span> /{" "}
              <span className="text-foreground">{totalPages}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="h-8 px-4 rounded-xl text-[10px] border-border text-muted-foreground hover:bg-muted/30 uppercase font-medium">
                <ChevronLeft className="h-3 w-3 mr-1" /> PREV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= totalPages}
                className="h-8 px-4 rounded-xl text-[10px] border-border text-muted-foreground hover:bg-muted/30 uppercase font-medium">
                NEXT <ChevronRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
