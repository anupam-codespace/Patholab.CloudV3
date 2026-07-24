"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getSortedRowModel,
  SortingState,
} from "@tanstack/react-table";
import {
  Building2,
  Users,
  TestTube,
  MoreHorizontal,
  Search,
  Filter,
  ShieldAlert,
  CheckCircle2,
  LogIn,
  ExternalLink,
  Mail,
  Plus,
  Copy,
  Loader2,
  ArrowUpDown,
  Wallet,
  Phone,
  Download,
} from "lucide-react";
import toast from "react-hot-toast";
import Link from "next/link";

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// --- TYPES (Updated for Wallet Architecture) ---
type LabData = {
  id: string;
  name: string;
  licenseNumber: string;
  city: string;
  isActive: boolean;
  createdAt: string;
  owner: {
    name: string;
    email: string;
    phone: string;
  };
  walletBalance: number;
  walletStatus: string;
  validityEndDate: string | null;
  _count: {
    tests: number;
    patients: number;
    staff: number;
  };
};

const formatCurrency = (val: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(val);

export default function AdminLabsPage() {
  const queryClient = useQueryClient();

  // State
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [isOnboardOpen, setIsOnboardOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // 1. FETCH DATA (Server-Side Pagination)
  const { data, isLoading } = useQuery({
    queryKey: ["admin-labs", page, search, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "10",
        search,
        status: statusFilter,
      });
      const res = await fetch(`/api/admin/labs?${params}`);
      if (!res.ok) throw new Error("Failed to fetch labs");
      return res.json();
    },
    placeholderData: (prev) => prev,
  });

  // 2. MUTATION: Toggle Status
  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: boolean }) => {
      const res = await fetch("/api/admin/labs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ labId: id, isActive: status }),
      });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      toast.success("Lab status updated successfully");
      queryClient.invalidateQueries({ queryKey: ["admin-labs"] });
    },
    onError: () => toast.error("Failed to update lab status"),
  });

  // 3. TABLE COLUMNS
  const columns: ColumnDef<LabData>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="font-bold"
          >
            Laboratory
            <ArrowUpDown className="ml-2 h-4 w-4 text-slate-400" />
          </Button>
        );
      },
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 border rounded-xl">
            <AvatarFallback className="bg-indigo-50 text-indigo-700 font-black rounded-xl">
              {row.original.name.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <Link
              href={`/admin/labs/${row.original.id}`}
              className="font-bold text-sm text-slate-900 hover:text-indigo-600 transition-colors line-clamp-1"
            >
              {row.original.name}
            </Link>
            <span className="text-xs text-slate-500 font-medium">
              {row.original.licenseNumber || "No License"}
            </span>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "owner",
      header: "Owner Details",
      cell: ({ row }) => (
        <div className="flex flex-col gap-1">
          <span className="text-sm font-bold text-slate-700">
            {row.original.owner.name}
          </span>
          <div className="flex items-center gap-1.5">
            <Mail className="h-3 w-3 text-slate-400" />
            <a
              href={`mailto:${row.original.owner.email}`}
              className="text-xs text-slate-500 hover:text-indigo-600 font-medium"
            >
              {row.original.owner.email}
            </a>
          </div>
          {row.original.owner.phone && (
            <div className="flex items-center gap-1.5">
              <Phone className="h-3 w-3 text-slate-400" />
              <a
                href={`tel:${row.original.owner.phone}`}
                className="text-xs text-slate-500 hover:text-indigo-600 font-medium"
              >
                {row.original.owner.phone}
              </a>
            </div>
          )}
        </div>
      ),
    },
    {
      id: "metrics",
      header: "Usage Metrics",
      cell: ({ row }) => (
        <div className="flex items-center gap-3 text-xs font-bold text-slate-600">
          <div
            className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-md"
            title="Total Tests"
          >
            <TestTube className="h-3.5 w-3.5 text-indigo-500" />{" "}
            {row.original._count.tests}
          </div>
          <div
            className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-md"
            title="Total Patients"
          >
            <Users className="h-3.5 w-3.5 text-blue-500" />{" "}
            {row.original._count.patients}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "walletBalance",
      header: "Wallet Balance",
      cell: ({ row }) => {
        const balance = row.original.walletBalance;
        const isLow = balance < 500;

        return (
          <div className="flex flex-col gap-1 items-start">
            <Badge
              variant="outline"
              className={`font-black tracking-wide ${isLow ? "bg-red-50 text-red-700 border-red-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"}`}
            >
              {formatCurrency(balance)}
            </Badge>
            {isLow && (
              <span className="text-[10px] font-bold text-red-500 uppercase">
                Low Bal
              </span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "isActive",
      header: "Status",
      cell: ({ row }) =>
        row.original.isActive ? (
          <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none shadow-none font-bold">
            Active
          </Badge>
        ) : (
          <Badge variant="destructive" className="shadow-none font-bold">
            Suspended
          </Badge>
        ),
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const lab = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0 rounded-lg">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[180px] rounded-xl">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => {
                  navigator.clipboard.writeText(lab.id);
                  toast.success("Lab ID copied to clipboard");
                }}
              >
                <Copy className="mr-2 h-4 w-4" /> Copy ID
              </DropdownMenuItem>
              <DropdownMenuSeparator />

              {/* ✅ CORRECT */}
              <DropdownMenuItem className="font-bold cursor-pointer" asChild>
                <Link href={`/admin/labs/${lab.id}`}>
                  <ExternalLink className="mr-2 h-4 w-4" /> View Details
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() =>
                  (window.location.href = `mailto:${lab.owner.email}`)
                }
                className="cursor-pointer"
              >
                <Mail className="mr-2 h-4 w-4" /> Email Owner
              </DropdownMenuItem>

              <DropdownMenuItem className="text-indigo-600 focus:text-indigo-700 focus:bg-indigo-50 font-bold cursor-pointer">
                <LogIn className="mr-2 h-4 w-4" /> Impersonate
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              {lab.isActive ? (
                <DropdownMenuItem
                  className="text-red-600 focus:text-red-700 focus:bg-red-50 font-bold cursor-pointer"
                  onClick={() =>
                    toggleStatusMutation.mutate({ id: lab.id, status: false })
                  }
                >
                  <ShieldAlert className="mr-2 h-4 w-4" /> Suspend Lab
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  className="text-emerald-600 focus:text-emerald-700 focus:bg-emerald-50 font-bold cursor-pointer"
                  onClick={() =>
                    toggleStatusMutation.mutate({ id: lab.id, status: true })
                  }
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" /> Activate Lab
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  const table = useReactTable({
    data: data?.labs || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    manualPagination: true,
    pageCount: data?.meta?.totalPages || 0,
    state: { sorting },
  });


  // --- EXPORT TO EXCEL (SERVER-SIDE FULL EXPORT) ---
  const handleExportExcel = async () => {
    setIsExporting(true);
    const toastId = toast.loading("Generating full export...");
    
    try {
      // Fetch the CSV file from our new endpoint
      const res = await fetch("/api/admin/labs/export");
      if (!res.ok) throw new Error("Failed to export data");

      // Convert the response to a Blob (Binary Large Object)
      const blob = await res.blob();
      
      // Create a temporary link element to trigger the browser download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      // The backend sets the filename, but we set a fallback here just in case
      link.setAttribute("download", `Full_Labs_Export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success("Excel sheet downloaded!", { id: toastId });
    } catch (error) {
      toast.error("Failed to generate export", { id: toastId });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-8 min-h-screen bg-slate-50/50">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">
            Lab Management
          </h1>
          <p className="text-slate-500 font-medium mt-1">
            Monitor, manage, and audit all registered tenants.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            onClick={handleExportExcel}
            disabled={isExporting} // 👈 Prevents spam-clicking
            className="rounded-xl h-11 font-bold border-slate-200 text-slate-700 hover:bg-slate-50"
          >
            {isExporting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin text-indigo-600" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            Export All Data
          </Button>  
          <OnboardLabDialog
            open={isOnboardOpen}
            onOpenChange={setIsOnboardOpen}
          />
        </div>
      </div>
      {/* STATS CARDS */}
      {data?.stats && !search && page === 1 && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="rounded-2xl border-slate-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Total Laboratories
              </CardTitle>
              <Building2 className="h-4 w-4 text-indigo-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black text-slate-900">
                {data.stats.totalLabs}
              </div>
              <p className="text-xs font-bold text-emerald-600">
                {data.stats.activeLabs} currently active
              </p>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-slate-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Total Wallet Funds
              </CardTitle>
              <Wallet className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black text-slate-900">
                {formatCurrency(data.stats.totalSystemWalletBalance || 0)}
              </div>
              <p className="text-xs font-bold text-slate-400">
                Total client liability
              </p>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-slate-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                System Health
              </CardTitle>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black text-emerald-600">99.9%</div>
              <p className="text-xs font-bold text-slate-400">
                Operational uptime
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* FILTER BAR */}
      <div className="flex flex-col sm:flex-row items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by lab name, license, owner email..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9 bg-slate-50 border-slate-200 rounded-xl h-11"
          />
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Select
            value={statusFilter}
            onValueChange={(v) => {
              setStatusFilter(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-full sm:w-[180px] bg-slate-50 border-slate-200 rounded-xl h-11">
              <Filter className="mr-2 h-4 w-4 text-slate-400" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active Only</SelectItem>
              <SelectItem value="inactive">Suspended</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* DATA TABLE */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50/80">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow
                key={headerGroup.id}
                className="border-slate-200 hover:bg-transparent"
              >
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="text-xs font-bold text-slate-500 uppercase tracking-wider h-11"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-32 text-center"
                >
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
                    <span className="text-slate-500 font-medium">
                      Loading laboratories...
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className="border-slate-100 hover:bg-slate-50/50"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-3">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-32 text-center"
                >
                  <div className="flex flex-col items-center justify-center gap-2">
                    <div className="h-12 w-12 rounded-full bg-slate-50 flex items-center justify-center mb-1">
                      <Users className="h-6 w-6 text-slate-300" />
                    </div>
                    <span className="text-slate-500 font-medium">
                      No labs found matching your filters.
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* PAGINATION */}
      <div className="flex items-center justify-between py-2">
        <div className="text-sm font-bold text-slate-500">
          Showing page {page} of {data?.meta?.totalPages || 1}
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl font-bold border-slate-200"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1 || isLoading}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl font-bold border-slate-200"
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= (data?.meta?.totalPages || 1) || isLoading}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// ONBOARDING DIALOG SUB-COMPONENT
// ==========================================
function OnboardLabDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [credentials, setCredentials] = useState<{
    email: string;
    tempPassword: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setCredentials(null);

    const formData = new FormData(e.currentTarget);
    const payload = {
      labName: formData.get("labName"),
      licenseNumber: formData.get("licenseNumber"),
      ownerName: formData.get("ownerName"),
      email: formData.get("email"),
      phone: formData.get("phone"),
      city: formData.get("city"),
      state: formData.get("state"),
    };

    try {
      const res = await fetch("/api/admin/labs/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      toast.success("Lab Onboarded Successfully!");
      setCredentials(data.credentials);
      queryClient.invalidateQueries({ queryKey: ["admin-labs"] });
    } catch (error: any) {
      toast.error(error.message || "Onboarding failed");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setCredentials(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <Button
          onClick={() => onOpenChange(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-11 px-6 font-bold shadow-sm"
        >
          <Plus className="mr-2 h-4 w-4" /> Onboard New Lab
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[550px] rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-black text-slate-900">
            Onboard New Laboratory
          </DialogTitle>
          <DialogDescription className="font-medium text-slate-500">
            Create a new tenant. They will automatically be provisioned a
            Pay-As-You-Go Wallet starting at ₹0.
          </DialogDescription>
        </DialogHeader>

        {!credentials ? (
          <form onSubmit={handleSubmit} className="space-y-5 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label
                  htmlFor="labName"
                  className="text-xs font-bold text-slate-600"
                >
                  Lab Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="labName"
                  name="labName"
                  placeholder="e.g. Apex Diagnostics"
                  className="rounded-xl h-11 bg-slate-50"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="licenseNumber"
                  className="text-xs font-bold text-slate-600"
                >
                  License No. <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="licenseNumber"
                  name="licenseNumber"
                  placeholder="DL-12345"
                  className="rounded-xl h-11 bg-slate-50"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="ownerName"
                className="text-xs font-bold text-slate-600"
              >
                Owner Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="ownerName"
                name="ownerName"
                placeholder="Dr. John Doe"
                className="rounded-xl h-11 bg-slate-50"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label
                  htmlFor="email"
                  className="text-xs font-bold text-slate-600"
                >
                  Email <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="admin@apex.com"
                  className="rounded-xl h-11 bg-slate-50"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="phone"
                  className="text-xs font-bold text-slate-600"
                >
                  Phone <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="phone"
                  name="phone"
                  placeholder="9876543210"
                  className="rounded-xl h-11 bg-slate-50"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label
                  htmlFor="city"
                  className="text-xs font-bold text-slate-600"
                >
                  City
                </Label>
                <Input
                  id="city"
                  name="city"
                  placeholder="Mumbai"
                  className="rounded-xl h-11 bg-slate-50"
                />
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="state"
                  className="text-xs font-bold text-slate-600"
                >
                  State
                </Label>
                <Input
                  id="state"
                  name="state"
                  placeholder="Maharashtra"
                  className="rounded-xl h-11 bg-slate-50"
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                className="rounded-xl h-11"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="rounded-xl h-11 bg-indigo-600 hover:bg-indigo-700"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {loading ? "Provisioning..." : "Create Tenant"}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="py-6 space-y-5">
            <div className="rounded-xl bg-emerald-50 p-4 border border-emerald-100">
              <div className="flex">
                <div className="flex-shrink-0">
                  <CheckCircle2
                    className="h-5 w-5 text-emerald-600"
                    aria-hidden="true"
                  />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-bold text-emerald-800">
                    Tenant Provisioned Successfully
                  </h3>
                  <div className="mt-1 text-xs font-medium text-emerald-700">
                    <p>
                      Share these temporary credentials with the lab owner.
                      Their Wallet balance is currently ₹0.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3 border border-slate-200 rounded-xl p-5 bg-slate-50">
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-slate-500">
                  Login Email:
                </span>
                <div className="flex items-center gap-2">
                  <code className="text-sm font-mono font-black text-slate-900 select-all">
                    {credentials.email}
                  </code>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 bg-white rounded-lg border border-slate-200"
                    onClick={() => {
                      navigator.clipboard.writeText(credentials.email);
                      toast.success("Email copied");
                    }}
                  >
                    <Copy className="h-4 w-4 text-slate-500" />
                  </Button>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-slate-500">
                  Temp Password:
                </span>
                <div className="flex items-center gap-2">
                  <code className="text-sm font-mono font-black text-slate-900 bg-white px-3 py-1.5 rounded-lg border border-slate-200 select-all">
                    {credentials.tempPassword}
                  </code>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 bg-white rounded-lg border border-slate-200"
                    onClick={() => {
                      navigator.clipboard.writeText(credentials.tempPassword);
                      toast.success("Password copied");
                    }}
                  >
                    <Copy className="h-4 w-4 text-slate-500" />
                  </Button>
                </div>
              </div>
            </div>

            <Button
              className="w-full rounded-xl h-11 font-bold"
              onClick={handleClose}
            >
              Done & Close
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
