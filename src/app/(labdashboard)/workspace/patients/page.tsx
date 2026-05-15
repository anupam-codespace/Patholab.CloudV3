"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
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
} from "lucide-react";
import { differenceInHours, differenceInMinutes } from "date-fns";
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

// --- SEARCH CONFIG ---
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

// --- MODERN UTILS ---
const getTAT = (date: string) => {
  if (!date) return <span className="text-slate-300">-</span>;
  const start = new Date(date);
  const now = new Date();
  const hours = differenceInHours(now, start);
  const mins = differenceInMinutes(now, start) % 60;

  let colorClass = "text-emerald-700 bg-emerald-50 border-emerald-200";
  if (hours > 24) colorClass = "text-rose-700 bg-rose-50 border-rose-200";
  else if (hours > 12)
    colorClass = "text-amber-700 bg-amber-50 border-amber-200";

  return (
    <div
      className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-1 rounded-md border ${colorClass} shadow-sm`}>
      <Clock className="h-3 w-3" /> {hours.toString().padStart(2, "0")}:
      {mins.toString().padStart(2, "0")}
    </div>
  );
};

const getTestColor = (status: string) => {
  switch (status) {
    case "APPROVED":
    case "COMPLETED":
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
  if (!invoice)
    return (
      <Badge
        variant="outline"
        className="text-slate-400 border-dashed text-[10px] uppercase tracking-wider bg-slate-50">
        Un-Billed
      </Badge>
    );
  if (invoice.status === "PAID")
    return (
      <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none text-[10px] px-2.5 uppercase tracking-wider font-bold">
        Paid
      </Badge>
    );
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

  const patients = data?.data || (Array.isArray(data) ? data : []);
  const totalRecords = data?.pagination?.total || 0;
  const totalPages = data?.pagination?.pages || 1;

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/workspace/patients/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete failed");
    },
    onSuccess: () => {
      toast.success("Patient deleted");
      queryClient.invalidateQueries({ queryKey: ["patients"] });
    },
    onError: () => toast.error("Failed to delete"),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const res = await fetch("/api/workspace/patients/bulk-delete", {
        method: "POST",
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) throw new Error("Bulk delete failed");
      return res.json();
    },
    onSuccess: () => {
      toast.success(`Deleted selected patients`);
      setSelectedIds([]);
      queryClient.invalidateQueries({ queryKey: ["patients"] });
    },
  });

  const handleSelectAll = (checked: boolean) => {
    if (checked) setSelectedIds(patients.map((p: any) => p.id));
    else setSelectedIds([]);
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) setSelectedIds((prev) => [...prev, id]);
    else setSelectedIds((prev) => prev.filter((item) => item !== id));
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this patient record?"))
      deleteMutation.mutate(id);
  };

  const handleBulkDelete = () => {
    if (
      confirm(
        `Are you sure you want to permanently delete ${selectedIds.length} items?`,
      )
    )
      bulkDeleteMutation.mutate(selectedIds);
  };

  const applyFilters = () => {
    setAppliedFilters(filters);
    setPage(1);
    setIsFilterOpen(false);
  };

  const clearFilters = () => {
    const reset = {
      dateFrom: "",
      dateTo: "",
      doctorId: "ALL",
      agencyId: "ALL",
      status: "ALL",
    };
    setFilters(reset);
    setAppliedFilters(reset);
    setPage(1);
    setIsFilterOpen(false);
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
      {/* Decorative Background Mesh */}
      <div className="absolute top-0 inset-x-0 h-64 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-100/40 via-slate-50 to-transparent pointer-events-none z-0" />

      <div className="flex-1 flex flex-col p-4 sm:p-6 z-10 overflow-hidden max-w-[1600px] mx-auto w-full">
        {/* --- TOP HEADER BAR --- */}
        <div className="flex-none mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/70 backdrop-blur-xl p-4 rounded-2xl border border-slate-200/60 shadow-sm">
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <div className="h-10 w-10 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center shadow-inner shrink-0">
              <FlaskConical className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2 leading-tight">
                Accession List
                <Badge
                  variant="secondary"
                  className="bg-indigo-50 text-indigo-700 hover:bg-indigo-50 font-mono text-xs">
                  {totalRecords}
                </Badge>
              </h1>
              <p className="text-xs font-medium text-slate-500 mt-0.5">
                Manage patient workflows and test routing.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            {/* Modern Search */}
            <Popover open={isSearchOpen} onOpenChange={setIsSearchOpen}>
              <PopoverTrigger asChild>
                <div className="relative w-full sm:w-72 group cursor-pointer">
                  <div className="absolute left-3 top-2.5 text-slate-400 group-hover:text-indigo-600 transition-colors">
                    <ActiveIcon className="h-4 w-4" />
                  </div>
                  <Input
                    placeholder={`Search by ${activeLabel}...`}
                    className="pl-9 pr-9 h-10 bg-white border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/20 rounded-xl transition-all cursor-pointer shadow-sm text-sm font-medium"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onClick={() => setIsSearchOpen(true)}
                  />
                  <div className="absolute right-3 top-2.5 text-slate-300 group-hover:text-indigo-400 transition-colors">
                    <SlidersHorizontal className="h-4 w-4" />
                  </div>
                </div>
              </PopoverTrigger>
              <PopoverContent
                className="w-80 p-0 shadow-2xl border-slate-100 rounded-2xl overflow-hidden"
                align="end"
                sideOffset={8}>
                <div className="bg-slate-50/80 backdrop-blur-sm p-4 border-b border-slate-100">
                  <h4 className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-2">
                    Search Field Selector
                  </h4>
                  <div className="relative">
                    <Input
                      autoFocus
                      placeholder="Type to search..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="h-10 bg-white border-slate-200 pl-9 rounded-xl focus:border-indigo-500 focus:ring-indigo-500/20"
                    />
                    <ActiveIcon className="absolute left-3 top-3 h-4 w-4 text-indigo-500" />
                  </div>
                </div>
                <div className="p-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                  <RadioGroup
                    value={searchField}
                    onValueChange={(val) => {
                      setSearchField(val);
                      setIsSearchOpen(false);
                    }}>
                    <div className="grid grid-cols-2 gap-1.5">
                      {SEARCH_CRITERIA.map((criteria) => (
                        <div key={criteria.id}>
                          <RadioGroupItem
                            value={criteria.id}
                            id={criteria.id}
                            className="peer sr-only"
                          />
                          <Label
                            htmlFor={criteria.id}
                            className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-transparent cursor-pointer hover:bg-slate-50 peer-data-[state=checked]:bg-indigo-50 peer-data-[state=checked]:border-indigo-100 peer-data-[state=checked]:text-indigo-700 transition-all text-slate-600">
                            <criteria.icon className="h-4 w-4 opacity-70" />
                            <span className="text-xs font-semibold">
                              {criteria.label}
                            </span>
                          </Label>
                        </div>
                      ))}
                    </div>
                  </RadioGroup>
                </div>
              </PopoverContent>
            </Popover>

            {/* Modern Filter */}
            <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant={activeFilterCount > 0 ? "secondary" : "outline"}
                  className={`h-10 rounded-xl gap-2 font-medium shadow-sm transition-colors ${activeFilterCount > 0 ? "text-indigo-700 bg-indigo-50 border-indigo-200 hover:bg-indigo-100" : "text-slate-600 bg-white border-slate-200 hover:bg-slate-50"}`}>
                  <Filter className="h-4 w-4" />
                  <span className="hidden sm:inline">Filters</span>
                  {activeFilterCount > 0 && (
                    <Badge className="h-5 px-1.5 bg-indigo-600 text-[10px] rounded-md">
                      {activeFilterCount}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-[350px] p-0 shadow-2xl border-slate-100 rounded-2xl overflow-hidden"
                align="end"
                sideOffset={8}>
                <div className="bg-slate-50/80 backdrop-blur-sm p-4 border-b border-slate-100 flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-2 uppercase tracking-wider">
                    <Filter className="h-3.5 w-3.5 text-indigo-600" />
                    Advanced Filters
                  </h4>
                  {activeFilterCount > 0 && (
                    <button
                      onClick={clearFilters}
                      className="text-[10px] font-bold text-rose-500 hover:text-rose-700 transition-colors uppercase tracking-wider">
                      Clear All
                    </button>
                  )}
                </div>

                <div className="p-5 space-y-5 max-h-[400px] overflow-y-auto custom-scrollbar">
                  <div className="space-y-3">
                    <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Registration Date
                    </Label>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-[10px] text-slate-400 font-semibold">
                          From
                        </Label>
                        <Input
                          type="date"
                          className="h-10 text-xs rounded-xl border-slate-200"
                          value={filters.dateFrom}
                          onChange={(e) =>
                            setFilters({ ...filters, dateFrom: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] text-slate-400 font-semibold">
                          To
                        </Label>
                        <Input
                          type="date"
                          className="h-10 text-xs rounded-xl border-slate-200"
                          value={filters.dateTo}
                          onChange={(e) =>
                            setFilters({ ...filters, dateTo: e.target.value })
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <Separator className="bg-slate-100" />

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">
                      Referral Doctor
                    </Label>
                    <Select
                      value={filters.doctorId}
                      onValueChange={(val) =>
                        setFilters({ ...filters, doctorId: val })
                      }>
                      <SelectTrigger className="h-10 text-sm rounded-xl border-slate-200">
                        <SelectValue placeholder="All Doctors" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">All Doctors</SelectItem>
                        {filterOptions?.doctors?.map((doc: any) => (
                          <SelectItem key={doc.id} value={doc.id}>
                            {doc.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">
                      Agency / Client
                    </Label>
                    <Select
                      value={filters.agencyId}
                      onValueChange={(val) =>
                        setFilters({ ...filters, agencyId: val })
                      }>
                      <SelectTrigger className="h-10 text-sm rounded-xl border-slate-200">
                        <SelectValue placeholder="All Agencies" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">All Agencies</SelectItem>
                        {filterOptions?.agencies?.map((ag: any) => (
                          <SelectItem key={ag.id} value={ag.id}>
                            {ag.agencyName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">
                      Payment Status
                    </Label>
                    <Select
                      value={filters.status}
                      onValueChange={(val) =>
                        setFilters({ ...filters, status: val })
                      }>
                      <SelectTrigger className="h-10 text-sm rounded-xl border-slate-200">
                        <SelectValue placeholder="All Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">All Status</SelectItem>
                        <SelectItem value="PAID">Fully Paid</SelectItem>
                        <SelectItem value="PENDING">Due / Pending</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
                  <Button
                    variant="ghost"
                    onClick={() => setIsFilterOpen(false)}
                    className="h-10 text-sm font-medium rounded-xl">
                    Cancel
                  </Button>
                  <Button
                    onClick={applyFilters}
                    className="bg-indigo-600 hover:bg-indigo-700 h-10 text-sm font-bold rounded-xl shadow-md shadow-indigo-500/20">
                    Apply Filters
                  </Button>
                </div>
              </PopoverContent>
            </Popover>

            <Button
              onClick={() => router.push("/workspace/registration")}
              className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 h-10 rounded-xl text-sm font-bold shadow-md shadow-indigo-500/25 transition-all duration-300 hover:-translate-y-0.5 whitespace-nowrap">
              <Plus className="h-4 w-4 mr-1.5" /> New Registration
            </Button>
          </div>
        </div>

        {/* --- MAIN DATA TABLE --- */}
        <Card className="flex-1 flex flex-col shadow-sm border-slate-200/80 overflow-hidden rounded-2xl bg-white">
          <div className="flex-1 overflow-auto relative custom-scrollbar">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead className="sticky top-0 z-20 bg-slate-50/90 backdrop-blur-md text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                <tr>
                  <th className="px-5 py-4 w-12 text-center">
                    <Checkbox
                      checked={
                        patients.length > 0 &&
                        selectedIds.length === patients.length
                      }
                      onCheckedChange={(c) => handleSelectAll(!!c)}
                      className="rounded-[4px] border-slate-300 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
                    />
                  </th>
                  <th className="px-4 py-4 w-[300px]">Patient Identity</th>
                  <th className="px-4 py-4 w-[150px]">Status & TAT</th>
                  <th className="px-4 py-4 min-w-[200px]">Tests & Samples</th>
                  <th className="px-4 py-4 w-[180px]">Routing</th>
                  <th className="px-4 py-4 text-center w-[120px]">Billing</th>
                  <th className="px-5 py-4 text-right w-[100px]">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="h-64 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-500 space-y-3">
                        <Loader2 className="animate-spin h-8 w-8 text-indigo-600" />
                        <span className="text-xs font-medium uppercase tracking-widest animate-pulse">
                          Loading Records...
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : patients.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="h-64 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-400 space-y-3">
                        <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center">
                          <Search className="h-8 w-8 text-slate-300" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-600">
                            No records found
                          </p>
                          <p className="text-xs mt-1 max-w-xs mx-auto">
                            We couldn't find any patients matching your current
                            search or filter criteria.
                          </p>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  patients.map((patient: any) => {
                    const invoice = patient.invoices?.[0];

                    // ✅ FRONTEND PATCH LOGIC
                    let refDoc =
                      patient.tests?.[0]?.doctor?.name ||
                      patient.doctor?.name ||
                      patient.tests?.[0]?.referredBy ||
                      "Self";
                    let refAgency =
                      patient.tests?.[0]?.agency?.agencyName ||
                      patient.agency?.agencyName;

                    if (
                      refDoc &&
                      refDoc.startsWith("c") &&
                      refDoc.length > 20 &&
                      !refDoc.includes(" ")
                    )
                      refDoc = "Self";
                    if (
                      refAgency &&
                      refAgency.startsWith("c") &&
                      refAgency.length > 20 &&
                      !refAgency.includes(" ")
                    )
                      refAgency = null;

                    const isSelected = selectedIds.includes(patient.id);
                    // Avatar initials
                    const initials = patient.name
                      .split(" ")
                      .map((n: string) => n[0])
                      .join("")
                      .substring(0, 2)
                      .toUpperCase();

                    return (
                      <tr
                        key={patient.id}
                        className={`group transition-all duration-200 cursor-pointer ${isSelected ? "bg-indigo-50/50" : "hover:bg-slate-50"}`}
                        onDoubleClick={() =>
                          router.push(`/workspace/patients/${patient.id}`)
                        }>
                        <td className="px-5 py-4 text-center">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(c) =>
                              handleSelectOne(patient.id, !!c)
                            }
                            className="rounded-[4px] border-slate-300 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
                          />
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className="hidden sm:flex h-10 w-10 bg-slate-100 rounded-full items-center justify-center text-slate-600 font-bold text-xs shrink-0 border border-slate-200">
                              {initials}
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-slate-900 truncate">
                                {patient.name}
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] font-mono text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded font-bold">
                                  {patient.patientId}
                                </span>
                                <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wide">
                                  {patient.age} {patient.ageUnit?.slice(0, 1)} •{" "}
                                  {patient.gender?.charAt(0)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          {getTAT(
                            patient.tests?.[0]?.createdAt || patient.updatedAt,
                          )}
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex flex-wrap gap-1.5 max-w-[250px]">
                            <TooltipProvider delayDuration={200}>
                              {patient.tests?.map((t: any) => (
                                <Tooltip key={t.id}>
                                  <TooltipTrigger asChild>
                                    <span
                                      className={`cursor-help px-2 py-1 rounded-md text-[10px] font-bold border ${getTestColor(t.status)} transition-colors`}>
                                      {t.testCode}
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent className="bg-slate-800 text-white border-slate-700 text-xs p-3 shadow-xl rounded-xl">
                                    <p className="font-bold mb-1.5">
                                      {t.testName}
                                    </p>
                                    <div className="flex items-center gap-2">
                                      <span className="text-slate-400 text-[10px] uppercase tracking-wider">
                                        Status:
                                      </span>
                                      <Badge
                                        variant="secondary"
                                        className="bg-slate-700 text-white border-slate-600 text-[10px]">
                                        {t.status}
                                      </Badge>
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              ))}
                            </TooltipProvider>
                            {(!patient.tests || patient.tests.length === 0) && (
                              <span className="text-slate-400 text-xs italic font-medium">
                                No Tests Assigned
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex flex-col gap-1 min-w-0">
                            <span className="font-semibold text-slate-700 truncate max-w-[150px] flex items-center gap-1.5">
                              <Stethoscope className="h-3 w-3 text-slate-400 shrink-0" />{" "}
                              {refDoc}
                            </span>
                            {refAgency && (
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 truncate max-w-[150px]">
                                <Briefcase className="h-3 w-3 text-slate-400 shrink-0" />{" "}
                                {refAgency}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-4 text-center">
                          <HoverCard openDelay={200}>
                            <HoverCardTrigger asChild>
                              <div className="cursor-pointer inline-block">
                                {getBillingStatus(invoice)}
                              </div>
                            </HoverCardTrigger>
                            {invoice && (
                              <HoverCardContent
                                className="w-64 p-0 shadow-2xl border-slate-100 rounded-xl overflow-hidden"
                                align="center">
                                <div className="bg-slate-50/80 backdrop-blur-sm px-4 py-3 border-b border-slate-100 text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                                  <Receipt className="h-4 w-4 text-slate-500" />{" "}
                                  Invoice Details
                                </div>
                                <div className="p-4 space-y-3 text-sm font-medium">
                                  <div className="flex justify-between text-slate-600">
                                    <span>Subtotal</span>{" "}
                                    <span>
                                      ₹
                                      {Number(invoice.subtotal || 0).toFixed(2)}
                                    </span>
                                  </div>
                                  <div className="border-t border-dashed border-slate-200 my-1 pt-2 flex justify-between font-black text-slate-900">
                                    <span>Net Payable</span>{" "}
                                    <span>
                                      ₹
                                      {Number(invoice.grandTotal || 0).toFixed(
                                        2,
                                      )}
                                    </span>
                                  </div>
                                  <div
                                    className={`flex justify-between font-bold px-2 py-1.5 rounded-lg ${invoice.status === "PAID" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                                    <span>Balance Due</span>{" "}
                                    <span>
                                      ₹
                                      {invoice.status === "PAID"
                                        ? "0.00"
                                        : Number(
                                            invoice.grandTotal || 0,
                                          ).toFixed(2)}
                                    </span>
                                  </div>
                                </div>
                              </HoverCardContent>
                            )}
                          </HoverCard>
                        </td>

                        <td className="px-5 py-4 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 data-[state=open]:bg-indigo-50 data-[state=open]:text-indigo-600 transition-colors">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              className="w-48 p-1.5 shadow-xl border-slate-100 rounded-xl">
                              {/* --- NEW ADD TEST OPTION --- */}
                              <Link
                                href={`/workspace/accession?patientId=${patient.id}`}>
                                <DropdownMenuItem className="cursor-pointer font-medium rounded-lg text-slate-700 py-2">
                                  <TestTube className="mr-2 h-4 w-4 text-emerald-500" />{" "}
                                  Add Test
                                </DropdownMenuItem>
                              </Link>

                              <Link
                                href={`/workspace/workflow/results/${patient.id}`}>
                                <DropdownMenuItem className="cursor-pointer font-medium rounded-lg text-slate-700 py-2">
                                  <FlaskConical className="mr-2 h-4 w-4 text-indigo-500" />{" "}
                                  Enter Results
                                </DropdownMenuItem>
                              </Link>

                              {invoice && (
                                <Link href={`/workspace/billing/${invoice.id}`}>
                                  <DropdownMenuItem className="cursor-pointer font-medium rounded-lg text-slate-700 py-2">
                                    <FileText className="mr-2 h-4 w-4 text-blue-500" />{" "}
                                    View Bill
                                  </DropdownMenuItem>
                                </Link>
                              )}
                              <DropdownMenuSeparator className="bg-slate-100 my-1" />
                              <Link href={`/workspace/patients/${patient.id}`}>
                                <DropdownMenuItem className="cursor-pointer font-medium rounded-lg text-slate-700 py-2">
                                  <Edit className="mr-2 h-4 w-4 text-slate-400" />{" "}
                                  Edit Details
                                </DropdownMenuItem>
                              </Link>
                              <Link
                                href={`/workspace/reports/print/${patient.id}`}>
                                <DropdownMenuItem className="cursor-pointer font-medium rounded-lg text-slate-700 py-2">
                                  📄 View Report
                                </DropdownMenuItem>
                              </Link>
                              <DropdownMenuSeparator className="bg-slate-100 my-1" />
                              <DropdownMenuItem
                                className="text-rose-600 focus:text-rose-700 focus:bg-rose-50 cursor-pointer font-bold rounded-lg py-2"
                                onClick={() => handleDelete(patient.id)}>
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

          {/* --- PAGINATION FOOTER --- */}
          <div className="flex-none px-6 py-4 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-white z-20">
            <div className="text-xs text-slate-500 font-semibold tracking-wide">
              Showing Page <span className="text-slate-900">{page}</span> of{" "}
              <span className="text-slate-900">{totalPages}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="h-9 px-4 rounded-xl text-xs font-bold border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">
                <ChevronLeft className="h-4 w-4 mr-1" /> Prev
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= totalPages}
                className="h-9 px-4 rounded-xl text-xs font-bold border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* --- FLOATING BULK ACTION BAR --- */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 backdrop-blur-md text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-5 border border-slate-700 animate-in slide-in-from-bottom-8 fade-in-50 duration-300">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 bg-indigo-500 rounded-full flex items-center justify-center text-[10px] font-bold">
              {selectedIds.length}
            </div>
            <span className="text-sm font-semibold tracking-wide">
              Selected
            </span>
          </div>
          <Separator orientation="vertical" className="h-6 bg-slate-700" />
          <button
            onClick={handleBulkDelete}
            className="text-sm text-rose-400 hover:text-rose-300 font-bold flex items-center gap-1.5 transition-colors">
            <Trash2 className="h-4 w-4" /> Delete
          </button>
          <button
            onClick={() => setSelectedIds([])}
            className="ml-2 text-slate-400 hover:text-white transition-colors bg-slate-800 hover:bg-slate-700 p-1 rounded-full">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
