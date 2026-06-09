"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  Plus,
  MoreHorizontal,
  FileText,
  FlaskConical,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Filter,
  Clock,
  Briefcase,
  Trash2,
  Edit,
  X,
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
  TestTube,
  MessageCircle,
  Printer,
  FileEdit,
  CheckCircle2,
  Calendar,
  HelpCircle,
} from "lucide-react";
import { differenceInHours, differenceInMinutes, format } from "date-fns";
import toast from "react-hot-toast";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  return format(d, "dd MMM yyyy");
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
      className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-md border ${colorClass} shadow-sm`}>
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
      return "text-slate-600 bg-slate-100 border-slate-200";
  }
};

const getBillingStatus = (invoice: any) => {
  if (!invoice) {
    return (
      <Badge
        variant="outline"
        className="text-slate-400 border-dashed text-[10px] uppercase tracking-wider bg-slate-50">
        Unbilled
      </Badge>
    );
  }
  if (invoice.status === "PAID") {
    return (
      <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none text-[10px] px-2.5 uppercase tracking-wider font-bold">
        Paid
      </Badge>
    );
  }
  return (
    <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-100 border-none text-[10px] px-2.5 uppercase tracking-wider font-bold animate-pulse">
      Dues
    </Badge>
  );
};

export default function PatientWorklistPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [searchField, setSearchField] = useState("all");
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState({
    dateFrom: "",
    dateTo: "",
    doctorId: "ALL",
    agencyId: "ALL",
    status: "ALL",
  });
  const [appliedFilters, setAppliedFilters] = useState(filters);
  const [activeTabFilter, setActiveTabFilter] = useState("ALL");

  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const { data: filterOptions } = useQuery({
    queryKey: ["filterOptions"],
    queryFn: async () => {
      const [docsRes, agenciesRes] = await Promise.allSettled([
        fetch("/api/workspace/doctors").then((r) => (r.ok ? r.json() : [])),
        fetch("/api/workspace/agencies").then((r) => (r.ok ? r.json() : [])),
      ]);
      return {
        doctors: docsRes.status === "fulfilled" ? docsRes.value : [],
        agencies: agenciesRes.status === "fulfilled" ? agenciesRes.value : [],
      };
    },
    staleTime: 1000 * 60 * 10,
  });

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
    from: appliedFilters.dateFrom || "",
    to: appliedFilters.dateTo || "",
    doctor: appliedFilters.doctorId || "",
    agency: appliedFilters.agencyId || "",
    status: appliedFilters.status || "",
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
  const totalRecords = data?.pagination?.total || 0;
  const totalPages = data?.pagination?.pages || 1;

  // --- MULTI-VISIT DATA FLATTENING LAYER ---
  const processedVisits = useMemo(() => {
    const visitsList: any[] = [];

    rawPatients.forEach((patient: any) => {
      const rawNum = (patient.patientId || "").replace(/\D/g, "");
      const baseIdString = rawNum.slice(-4).padStart(4, "0");

      if (!patient.tests || patient.tests.length === 0) {
        const creationDate = new Date(patient.createdAt);
        const dynamicVisitId = `${format(creationDate, "ddMM")}${baseIdString}`;

        visitsList.push({
          uniqueVisitKey: `${patient.id}-notests`,
          patient,
          visitId: dynamicVisitId,
          date: creationDate,
          status: "NO_TESTS",
          tests: [],
          invoice: patient.invoices?.[0] || null,
        });
        return;
      }

      const testsGroupedByDate = patient.tests.reduce(
        (acc: any, currentTest: any) => {
          const groupingKey = format(
            new Date(currentTest.createdAt),
            "yyyy-MM-dd",
          );
          if (!acc[groupingKey]) acc[groupingKey] = [];
          acc[groupingKey].push(currentTest);
          return acc;
        },
        {},
      );

      Object.entries(testsGroupedByDate).forEach(
        ([dateString, testsArray]: [string, any]) => {
          const visitCalendarDate = new Date(dateString);
          const dynamicVisitId = `${format(visitCalendarDate, "ddMM")}${baseIdString}`;

          const isFullyApproved = testsArray.every(
            (t: any) =>
              t.status === "COMPLETED" ||
              t.status === "APPROVED" ||
              t.status === "DELIVERED",
          );
          const visitComputedStatus = isFullyApproved ? "COMPLETED" : "PENDING";

          const mappedInvoice =
            patient.invoices?.find(
              (inv: any) =>
                format(new Date(inv.createdAt), "yyyy-MM-dd") === dateString,
            ) ||
            patient.invoices?.[0] ||
            null;

          visitsList.push({
            uniqueVisitKey: `${patient.id}-${dateString}`,
            patient,
            visitId: dynamicVisitId,
            date: new Date(testsArray[0]?.createdAt || dateString),
            status: visitComputedStatus,
            tests: testsArray,
            invoice: mappedInvoice,
          });
        },
      );
    });

    return visitsList.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [rawPatients]);

  // --- CLIENT SIDE TAB FILTER ROUTING ---
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
      toast.success("Patient entry removed");
      queryClient.invalidateQueries({ queryKey: ["patients"] });
    },
    onError: () => toast.error("Failed to delete record"),
  });

  const handleWhatsAppTrigger = (
    phone: string,
    name: string,
    visitId: string,
  ) => {
    const normalizedPhone = phone.replace(/\D/g, "");
    const textString = encodeURIComponent(
      `Hello ${name}, your booking reference ID ${visitId} is recorded at our laboratory. We will notify you once reports are generated.`,
    );
    window.open(
      `https://wa.me/91${normalizedPhone}?text=${textString}`,
      "_blank",
    );
  };

  const ActiveIcon =
    SEARCH_CRITERIA.find((c) => c.id === searchField)?.icon || Search;
  const activeLabel =
    SEARCH_CRITERIA.find((c) => c.id === searchField)?.label || "Global Search";
  const activeFilterCount = [
    appliedFilters.dateFrom,
    appliedFilters.dateTo,
    appliedFilters.doctorId !== "ALL",
    appliedFilters.agencyId !== "ALL",
    appliedFilters.status !== "ALL",
  ].filter(Boolean).length;

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-slate-50 font-sans relative overflow-hidden selection:bg-indigo-100">
      <div className="absolute top-0 inset-x-0 h-64 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-100/40 via-slate-50 to-transparent pointer-events-none z-0" />

      <div className="flex-1 flex flex-col p-4 sm:p-6 z-10 overflow-hidden max-w-[1600px] mx-auto w-full">
        {/* --- CONTROL BAR PACKET --- */}
        <div className="flex-none mb-4 flex flex-col gap-4 bg-white/70 backdrop-blur-xl p-4 rounded-2xl border border-slate-200/60 shadow-sm">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-4 w-full sm:w-auto">
              <div className="h-10 w-10 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center shadow-inner shrink-0">
                <FlaskConical className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2 leading-none">
                  Patient Visit Worklist
                  <Badge
                    variant="secondary"
                    className="bg-indigo-50 text-indigo-700 font-mono text-xs">
                    {filteredVisits.length} Records Active
                  </Badge>
                </h1>
                <p className="text-xs font-medium text-slate-500 mt-1">
                  Consolidated enterprise directory showing distinct client
                  clinical visit streams.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              {/* Search Trigger Component */}
              <Popover open={isSearchOpen} onOpenChange={setIsSearchOpen}>
                <PopoverTrigger asChild>
                  <div className="relative w-full sm:w-72 group cursor-pointer">
                    <div className="absolute left-3 top-2.5 text-slate-400 group-hover:text-indigo-600 transition-colors">
                      <ActiveIcon className="h-4 w-4" />
                    </div>
                    <Input
                      placeholder={`Search by ${activeLabel}...`}
                      className="pl-9 pr-9 h-10 bg-white border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/20 rounded-xl cursor-pointer font-medium"
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
                        className="h-10 bg-white pl-9 rounded-xl focus:border-indigo-500"
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
                              className="flex items-center gap-2 px-3 py-2 rounded-xl border border-transparent cursor-pointer hover:bg-slate-50 peer-data-[state=checked]:bg-indigo-50 peer-data-[state=checked]:text-indigo-700 transition-all text-xs font-semibold">
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

              {/* Advanced Criteria Filter Drawer */}
              <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant={activeFilterCount > 0 ? "secondary" : "outline"}
                    className={`h-10 rounded-xl gap-2 font-medium shadow-sm ${activeFilterCount > 0 ? "text-indigo-700 bg-indigo-50 border-indigo-200" : "bg-white"}`}>
                    <Filter className="h-4 w-4" />
                    <span>Filters</span>
                    {activeFilterCount > 0 && (
                      <Badge className="h-5 px-1.5 bg-indigo-600 text-[10px]">
                        {activeFilterCount}
                      </Badge>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-[350px] p-0 shadow-2xl border-slate-100 rounded-2xl overflow-hidden"
                  align="end"
                  sideOffset={8}>
                  <div className="bg-slate-50/80 p-4 border-b border-slate-100 flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                      <Filter className="h-3.5 w-3.5 text-indigo-600" /> Scope
                      Filters
                    </h4>
                    {activeFilterCount > 0 && (
                      <button
                        onClick={() => {
                          setFilters({
                            dateFrom: "",
                            dateTo: "",
                            doctorId: "ALL",
                            agencyId: "ALL",
                            status: "ALL",
                          });
                          setAppliedFilters({
                            dateFrom: "",
                            dateTo: "",
                            doctorId: "ALL",
                            agencyId: "ALL",
                            status: "ALL",
                          });
                        }}
                        className="text-[10px] font-bold text-rose-500 uppercase tracking-wider">
                        Clear
                      </button>
                    )}
                  </div>
                  <div className="p-5 space-y-4 max-h-[400px] overflow-y-auto">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold text-slate-500 uppercase">
                        Registration Range
                      </Label>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          type="date"
                          className="h-9 text-xs rounded-xl"
                          value={filters.dateFrom}
                          onChange={(e) =>
                            setFilters({ ...filters, dateFrom: e.target.value })
                          }
                        />
                        <Input
                          type="date"
                          className="h-9 text-xs rounded-xl"
                          value={filters.dateTo}
                          onChange={(e) =>
                            setFilters({ ...filters, dateTo: e.target.value })
                          }
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-bold text-slate-700">
                        Clinician Alignment
                      </Label>
                      <Select
                        value={filters.doctorId}
                        onValueChange={(val) =>
                          setFilters({ ...filters, doctorId: val })
                        }>
                        <SelectTrigger className="h-9 rounded-xl">
                          <SelectValue placeholder="All Doctors" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ALL">
                            All Alignment Channels
                          </SelectItem>
                          {filterOptions?.doctors?.map((doc: any) => (
                            <SelectItem key={doc.id} value={doc.id}>
                              {doc.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      onClick={() => setIsFilterOpen(false)}
                      className="h-9 text-xs font-medium rounded-xl">
                      Cancel
                    </Button>
                    <Button
                      onClick={() => {
                        setAppliedFilters(filters);
                        setPage(1);
                        setIsFilterOpen(false);
                      }}
                      className="bg-indigo-600 hover:bg-indigo-700 h-9 text-xs font-bold rounded-xl text-white">
                      Apply
                    </Button>
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

          {/* --- WORKLIST SEGMENTED CONSOLE FILTER TABS --- */}
          <div className="border-t border-slate-100 pt-3">
            <Tabs
              value={activeTabFilter}
              onValueChange={setActiveTabFilter}
              className="w-full">
              <TabsList className="bg-slate-100/80 p-1 rounded-xl flex justify-start gap-1 w-full sm:w-max overflow-x-auto">
                <TabsTrigger
                  value="ALL"
                  className="rounded-lg text-xs font-bold px-4 py-2 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm">
                  All Visits ({processedVisits.length})
                </TabsTrigger>
                <TabsTrigger
                  value="COMPLETED"
                  className="rounded-lg text-xs font-bold px-4 py-2 data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-sm flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Full Print Ready
                </TabsTrigger>
                <TabsTrigger
                  value="PENDING"
                  className="rounded-lg text-xs font-bold px-4 py-2 data-[state=active]:bg-amber-500 data-[state=active]:text-white data-[state=active]:shadow-sm flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" /> Entry Pending
                </TabsTrigger>
                <TabsTrigger
                  value="NO_TESTS"
                  className="rounded-lg text-xs font-bold px-4 py-2 data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-sm flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5" /> Registration Only
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* --- GRID MASTER TABLE --- */}
        <Card className="flex-1 flex flex-col shadow-sm border-slate-200/80 overflow-hidden rounded-2xl bg-white">
          <div className="flex-1 overflow-auto relative custom-scrollbar">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead className="sticky top-0延 z-20 bg-slate-50/90 backdrop-blur-md text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3 w-12 text-center">
                    <Checkbox
                      checked={
                        filteredVisits.length > 0 &&
                        selectedIds.length === filteredVisits.length
                      }
                      onCheckedChange={(c) =>
                        setSelectedIds(
                          c ? filteredVisits.map((v) => v.uniqueVisitKey) : [],
                        )
                      }
                      className="rounded-[4px] border-slate-300"
                    />
                  </th>
                  <th className="px-4 py-3 w-[160px]">Visit Registry ID</th>
                  <th className="px-4 py-3 w-[250px]">
                    Patient Profile & Demographics
                  </th>
                  <th className="px-4 py-3 w-[120px]">TAT Analytics</th>
                  <th className="px-4 py-3 min-w-[260px]">
                    Assigned Operational Assays
                  </th>
                  <th className="px-4 py-3 w-[160px]">Referral Channels</th>
                  <th className="px-4 py-3 text-center w-[110px]">
                    Financials
                  </th>
                  <th className="px-5 py-3 text-right w-[110px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="h-64 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-500 space-y-2">
                        <Loader2 className="animate-spin h-6 w-6 text-indigo-600" />
                        <span className="text-[10px] uppercase tracking-widest font-bold animate-pulse">
                          Synchronizing Core Engine Database...
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : filteredVisits.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="h-64 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-400 space-y-2">
                        <Search className="h-6 w-6 text-slate-300" />
                        <p className="font-bold text-xs text-slate-600">
                          Zero active segment results found
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredVisits.map((visit: any) => {
                    const isRowSelected = selectedIds.includes(
                      visit.uniqueVisitKey,
                    );
                    const patientInitials = visit.patient.name
                      .substring(0, 2)
                      .toUpperCase();

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
                        className={`group transition-all ${isRowSelected ? "bg-indigo-50/30" : "hover:bg-slate-50/70"}`}>
                        <td className="px-5 py-4 text-center">
                          <Checkbox
                            checked={isRowSelected}
                            onCheckedChange={(c) =>
                              setSelectedIds(
                                c
                                  ? [...selectedIds, visit.uniqueVisitKey]
                                  : selectedIds.filter(
                                      (id) => id !== visit.uniqueVisitKey,
                                    ),
                              )
                            }
                            className="rounded-[4px] border-slate-300"
                          />
                        </td>

                        {/* 🆔 DYNAMIC VISIT TRACKER ID */}
                        <td className="px-4 py-4">
                          <div className="flex flex-col gap-1">
                            <Badge
                              variant="outline"
                              className="font-mono bg-indigo-50/50 font-black text-indigo-700 border-indigo-100 text-[11px] px-2.5 py-0.5 rounded-lg w-max shadow-sm">
                              {visit.visitId}
                            </Badge>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1 pl-1">
                              <Calendar className="w-3 h-3 text-slate-300" />{" "}
                              {safeFormatDate(visit.date)}
                            </span>
                          </div>
                        </td>

                        {/* 👤 PATIENT DEMOGRAPHICS SHEET */}
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 bg-gradient-to-br from-slate-100 to-slate-200 text-slate-700 font-bold text-xs rounded-full flex items-center justify-center border border-slate-200 shadow-sm shrink-0">
                              {patientInitials}
                            </div>
                            <div className="min-w-0 space-y-0.5">
                              <div className="font-black text-slate-900 truncate tracking-tight text-sm flex items-center gap-2">
                                {visit.patient.name}
                              </div>
                              <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold uppercase tracking-wide">
                                <span>
                                  {visit.patient.age}{" "}
                                  {visit.patient.ageUnit?.slice(0, 1)}
                                </span>
                                <span>•</span>
                                <span>{visit.patient.gender}</span>
                              </div>
                              <div className="flex items-center gap-1.5 pt-0.5">
                                <span className="text-[10px] font-mono font-bold text-slate-600">
                                  {visit.patient.phone}
                                </span>
                                <button
                                  onClick={() =>
                                    handleWhatsAppTrigger(
                                      visit.patient.phone,
                                      visit.patient.name,
                                      visit.visitId,
                                    )
                                  }
                                  className="p-1 rounded-full text-emerald-600 hover:bg-emerald-50 transition-colors"
                                  title="Send Instant Alert WhatsApp">
                                  <MessageCircle className="w-3.5 h-3.5 fill-current" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* ⏱️ REAL TIME LOGISTICS TAT ANALYTICS */}
                        <td className="px-4 py-4">{getTAT(visit.date)}</td>

                        {/* 🧪 TESTING PARCELS WITH CONTEMPORARY ENTRY CONDITIONAL INDICATORS */}
                        <td className="px-4 py-4">
                          <div className="flex flex-wrap gap-1.5 max-w-[340px]">
                            {visit.tests.map((testItem: any) => (
                              <TooltipProvider
                                key={testItem.id}
                                delayDuration={100}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div
                                      className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[10px] font-bold border ${getTestStatusBadge(testItem.status)} cursor-pointer transition-all hover:scale-105`}>
                                      <span>{testItem.testCode}</span>
                                      {testItem.status === "PENDING" && (
                                        <Clock className="w-3 h-3 text-amber-500 animate-spin" />
                                      )}
                                      {(testItem.status === "COMPLETED" ||
                                        testItem.status === "APPROVED") && (
                                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                      )}
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent className="bg-slate-900 text-slate-50 text-xs rounded-xl p-3 shadow-2xl border-slate-800">
                                    <p className="font-extrabold">
                                      {testItem.testName}
                                    </p>
                                    <p className="text-[10px] text-slate-400 mt-1 uppercase">
                                      Process Stage: {testItem.status}
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            ))}
                            {visit.tests.length === 0 && (
                              <span className="text-slate-400 text-xs italic font-semibold flex items-center gap-1">
                                <AlertCircle className="w-3.5 h-3.5 opacity-60" />{" "}
                                File Saved Without Core Parameters
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 🩺 CHANNEL ACCOUNTABILITY */}
                        <td className="px-4 py-4">
                          <div className="flex flex-col gap-0.5 text-xs">
                            <span className="font-bold text-slate-700 flex items-center gap-1.5">
                              <Stethoscope className="h-3 w-3 text-slate-400 shrink-0" />{" "}
                              {derivedDoctor}
                            </span>
                            {derivedAgency && (
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                <Briefcase className="h-3 w-3 text-slate-300 shrink-0" />{" "}
                                {derivedAgency}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 💰 COMPREHENSIVE REVENUE LEDGER MODAL POPUPS */}
                        <td className="px-4 py-4 text-center">
                          <HoverCard openDelay={100}>
                            <HoverCardTrigger asChild>
                              <div className="cursor-pointer">
                                {getBillingStatus(visit.invoice)}
                              </div>
                            </HoverCardTrigger>
                            {visit.invoice && (
                              <HoverCardContent
                                className="w-60 p-0 shadow-2xl border-slate-100 rounded-xl overflow-hidden"
                                align="center">
                                <div className="bg-slate-50 px-4 py-2 border-b text-[10px] font-bold text-slate-600 uppercase flex items-center gap-1.5">
                                  <Receipt className="h-3.5 w-3.5" /> Ledger
                                  Audit Map
                                </div>
                                <div className="p-4 space-y-2 text-xs font-semibold">
                                  <div className="flex justify-between text-slate-500">
                                    <span>Gross Value</span>{" "}
                                    <span>
                                      ₹
                                      {Number(
                                        visit.invoice.subtotal || 0,
                                      ).toFixed(2)}
                                    </span>
                                  </div>
                                  <div className="flex justify-between text-slate-500">
                                    <span>Discounts</span>{" "}
                                    <span>
                                      ₹
                                      {Number(
                                        visit.invoice.discount || 0,
                                      ).toFixed(2)}
                                    </span>
                                  </div>
                                  <div className="border-t border-dashed pt-2 flex justify-between font-black text-slate-900 text-sm">
                                    <span>Net Amount</span>{" "}
                                    <span>
                                      ₹
                                      {Number(
                                        visit.invoice.grandTotal || 0,
                                      ).toFixed(2)}
                                    </span>
                                  </div>
                                </div>
                              </HoverCardContent>
                            )}
                          </HoverCard>
                        </td>

                        {/* ⚙️ INTELLIGENT DYNAMIC FLOW MATRIX CALL TRIGGERS */}
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Dynamic High Priority Primary Icons based on Visit processing flags */}
                            {visit.status === "COMPLETED" && (
                              <TooltipProvider delayDuration={50}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-8 w-8 text-emerald-600 hover:bg-emerald-50 rounded-lg shrink-0 border border-emerald-100 bg-emerald-50/20"
                                      onClick={() =>
                                        router.push(
                                          `/workspace/reports/print/${visit.patient.id}`,
                                        )
                                      }>
                                      <Printer className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent className="bg-slate-900 text-white text-[10px] font-bold rounded-lg px-2.5 py-1">
                                    Print Authenticated Lab Report
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}

                            {visit.status === "PENDING" && (
                              <TooltipProvider delayDuration={50}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-8 w-8 text-amber-600 hover:bg-amber-50 rounded-lg shrink-0 border border-amber-100 bg-amber-50/20"
                                      onClick={() =>
                                        router.push(
                                          `/workspace/workflow/results/${visit.patient.id}`,
                                        )
                                      }>
                                      <FileEdit className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent className="bg-slate-900 text-white text-[10px] font-bold rounded-lg px-2.5 py-1">
                                    Result Entry Missing - Transmit Parameters
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent
                                align="end"
                                className="w-52 p-1.5 shadow-2xl border-slate-100 rounded-xl">
                                <DropdownMenuItem
                                  onClick={() =>
                                    router.push(
                                      `/workspace/accession?patientId=${visit.patient.id}&isNewVisit=true`,
                                    )
                                  }
                                  className="cursor-pointer font-bold rounded-lg py-2">
                                  <TestTube className="mr-2 h-4 w-4 text-indigo-500" />{" "}
                                  New Booking Visit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() =>
                                    router.push(
                                      `/workspace/patients/${visit.patient.id}`,
                                    )
                                  }
                                  className="cursor-pointer font-medium rounded-lg text-slate-700 py-2">
                                  <Edit className="mr-2 h-4 w-4 text-slate-400" />{" "}
                                  Edit Master Profile
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="bg-slate-100 my-1" />
                                <DropdownMenuItem
                                  className="text-rose-600 focus:text-rose-700 focus:bg-rose-50 font-bold rounded-lg py-2"
                                  onClick={() =>
                                    handleDelete(visit.patient.id)
                                  }>
                                  <Trash2 className="mr-2 h-4 w-4" /> Purge
                                  Global Record
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

          {/* --- PAGINATION CONSOLE FOOTER --- */}
          <div className="flex-none px-6 py-4 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-white z-20">
            <div className="text-xs text-slate-500 font-bold tracking-wide uppercase">
              Page <span className="text-slate-900 font-black">{page}</span> /{" "}
              <span className="text-slate-900 font-black">{totalPages}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="h-9 px-4 rounded-xl text-xs font-black border-slate-200 text-slate-600 hover:bg-slate-50">
                <ChevronLeft className="h-4 w-4 mr-1" /> Prev
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= totalPages}
                className="h-9 px-4 rounded-xl text-xs font-black border-slate-200 text-slate-600 hover:bg-slate-50">
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
