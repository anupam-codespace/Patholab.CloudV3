'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  ColumnDef, 
  flexRender, 
  getCoreRowModel, 
  useReactTable, 
  getPaginationRowModel,
  getSortedRowModel,
  SortingState
} from '@tanstack/react-table';
import { 
  Building2, Users, TestTube, MoreHorizontal, Search, 
  Filter, ShieldAlert, CheckCircle2, XCircle, LogIn, 
  ExternalLink, Mail, Plus, Copy, Loader2, ArrowUpDown
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import Link from 'next/link';

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, 
  DropdownMenuSeparator, DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Dialog, DialogContent, DialogDescription, DialogFooter, 
  DialogHeader, DialogTitle, DialogTrigger 
} from "@/components/ui/dialog";

// --- TYPES ---
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
  subscription?: {
    status: string;
    plan: { displayName: string };
  };
  _count: {
    tests: number;
    patients: number;
    staff: number;
  };
};

export default function AdminLabsPage() {
  const queryClient = useQueryClient();
  
  // State
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sorting, setSorting] = useState<SortingState>([]);
  const [isOnboardOpen, setIsOnboardOpen] = useState(false);

  // 1. FETCH DATA (Server-Side Pagination)
  const { data, isLoading } = useQuery({
    queryKey: ['admin-labs', page, search, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        search,
        status: statusFilter
      });
      const res = await fetch(`/api/admin/labs?${params}`);
      if (!res.ok) throw new Error('Failed to fetch labs');
      return res.json();
    },
    placeholderData: (prev) => prev
  });

  // 2. MUTATION: Toggle Status
  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: boolean }) => {
      const res = await fetch('/api/admin/labs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ labId: id, isActive: status }),
      });
      if (!res.ok) throw new Error('Failed');
    },
    onSuccess: () => {
      toast.success('Lab status updated successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-labs'] });
    },
    onError: () => toast.error('Failed to update lab status')
  });

  // 3. TABLE COLUMNS
  const columns: ColumnDef<LabData>[] = [
    {
      accessorKey: 'name',
      header: ({ column }) => {
        return (
          <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
            Laboratory
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9 border">
            <AvatarFallback className="bg-primary/10 text-primary font-bold">
              {row.original.name.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <Link href={`/admin/labs/${row.original.id}`} className="font-medium text-sm hover:underline hover:text-primary transition-colors">
              {row.original.name}
            </Link>
            <span className="text-xs text-muted-foreground">{row.original.licenseNumber}</span>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'owner',
      header: 'Owner',
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="text-sm font-medium">{row.original.owner.name}</span>
          <a href={`mailto:${row.original.owner.email}`} className="text-xs text-muted-foreground hover:text-primary">
            {row.original.owner.email}
          </a>
        </div>
      ),
    },
    {
      id: 'metrics',
      header: 'Metrics',
      cell: ({ row }) => (
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1" title="Total Tests">
            <TestTube className="h-3 w-3" /> {row.original._count.tests}
          </div>
          <div className="flex items-center gap-1" title="Total Patients">
            <Users className="h-3 w-3" /> {row.original._count.patients}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'subscription',
      header: 'Plan',
      cell: ({ row }) => {
        const sub = row.original.subscription;
        return sub ? (
          <Badge variant="outline" className="text-xs font-normal border-primary/20 text-primary">
            {sub.plan.displayName}
          </Badge>
        ) : (
          <Badge variant="secondary" className="text-xs">No Plan</Badge>
        );
      },
    },
    {
      accessorKey: 'isActive',
      header: 'Status',
      cell: ({ row }) => (
        row.original.isActive ? (
          <Badge className="bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400 border-none shadow-none">
            Active
          </Badge>
        ) : (
          <Badge variant="destructive" className="shadow-none">Suspended</Badge>
        )
      ),
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const lab = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[180px]">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => {
                navigator.clipboard.writeText(lab.id);
                toast.success('Lab ID copied to clipboard');
              }}>
                <Copy className="mr-2 h-4 w-4" /> Copy ID
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              
              <Link href={`/admin/labs/${lab.id}`}>
                <DropdownMenuItem>
                  <ExternalLink className="mr-2 h-4 w-4" /> View Details
                </DropdownMenuItem>
              </Link>

              <DropdownMenuItem onClick={() => window.location.href = `mailto:${lab.owner.email}`}>
                <Mail className="mr-2 h-4 w-4" /> Email Owner
              </DropdownMenuItem>
              
              <DropdownMenuItem className="text-orange-600 focus:text-orange-700">
                <LogIn className="mr-2 h-4 w-4" /> Impersonate
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
              {lab.isActive ? (
                <DropdownMenuItem 
                  className="text-red-600 focus:text-red-700 focus:bg-red-50"
                  onClick={() => toggleStatusMutation.mutate({ id: lab.id, status: false })}
                >
                  <ShieldAlert className="mr-2 h-4 w-4" /> Suspend Lab
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem 
                  className="text-green-600 focus:text-green-700 focus:bg-green-50"
                  onClick={() => toggleStatusMutation.mutate({ id: lab.id, status: true })}
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
    data: data?.data || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    manualPagination: true,
    pageCount: data?.meta?.totalPages || 0,
    state: { sorting },
  });

  return (
    <div className="space-y-6 p-8 min-h-screen bg-muted/5">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Lab Management</h1>
          <p className="text-muted-foreground">Monitor, manage, and audit all registered tenants.</p>
        </div>
        
        <OnboardLabDialog open={isOnboardOpen} onOpenChange={setIsOnboardOpen} />
      </div>

      {/* STATS CARDS (Only show on first page without filters) */}
      {data?.stats && !search && page === 1 && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Laboratories</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.stats.totalLabs}</div>
              <p className="text-xs text-muted-foreground">{data.stats.activeLabs} currently active</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Platform Revenue</CardTitle>
              <div className="h-4 w-4 text-muted-foreground">₹</div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{(data.stats.totalRevenue || 0).toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Lifetime collected</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">System Health</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">99.9%</div>
              <p className="text-xs text-muted-foreground">Operational uptime</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* FILTER BAR */}
      <div className="flex flex-col sm:flex-row items-center gap-4 bg-background/50 p-4 rounded-lg border">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by lab name, license, owner email..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9 bg-background"
          />
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="w-full sm:w-[180px] bg-background">
              <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active Only</SelectItem>
              <SelectItem value="inactive">Suspended</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* DATA TABLE */}
      <div className="rounded-md border bg-card shadow-sm">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
               <TableRow>
                 <TableCell colSpan={columns.length} className="h-32 text-center">
                   <div className="flex items-center justify-center gap-2">
                     <Loader2 className="h-6 w-6 animate-spin text-primary" />
                     <span className="text-muted-foreground">Loading laboratories...</span>
                   </div>
                 </TableCell>
               </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-32 text-center">
                   <div className="flex flex-col items-center justify-center gap-1">
                     <Users className="h-8 w-8 text-muted-foreground/30" />
                     <span className="text-muted-foreground">No labs found matching your filters.</span>
                   </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* PAGINATION */}
      <div className="flex items-center justify-between py-4">
        <div className="text-sm text-muted-foreground">
           Showing page {page} of {data?.meta?.totalPages || 1}
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1 || isLoading}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
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
function OnboardLabDialog({ open, onOpenChange }: { open: boolean, onOpenChange: (v: boolean) => void }) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [credentials, setCredentials] = useState<{email: string, tempPassword: string} | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setCredentials(null);

    const formData = new FormData(e.currentTarget);
    const payload = {
      labName: formData.get('labName'),
      licenseNumber: formData.get('licenseNumber'),
      ownerName: formData.get('ownerName'),
      email: formData.get('email'),
      phone: formData.get('phone'),
      city: formData.get('city'),
      state: formData.get('state'),
    };

    try {
      const res = await fetch('/api/admin/labs/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      toast.success('Lab Onboarded Successfully!');
      setCredentials(data.credentials); 
      queryClient.invalidateQueries({ queryKey: ['admin-labs'] });
      
    } catch (error: any) {
      toast.error(error.message || 'Onboarding failed');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setCredentials(null);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <Button onClick={() => onOpenChange(true)} className="bg-primary hover:bg-primary/90">
          <Plus className="mr-2 h-4 w-4" /> Onboard New Lab
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Onboard New Laboratory</DialogTitle>
          <DialogDescription>
            Create a new tenant environment. This will create a Lab entity, an Admin User, and assign a Trial Subscription.
          </DialogDescription>
        </DialogHeader>

        {!credentials ? (
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="labName">Lab Name <span className="text-red-500">*</span></Label>
                <Input id="labName" name="labName" placeholder="e.g. Apex Diagnostics" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="licenseNumber">License No. <span className="text-red-500">*</span></Label>
                <Input id="licenseNumber" name="licenseNumber" placeholder="DL-12345" required />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ownerName">Owner Name <span className="text-red-500">*</span></Label>
              <Input id="ownerName" name="ownerName" placeholder="Dr. John Doe" required />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email <span className="text-red-500">*</span></Label>
                <Input id="email" name="email" type="email" placeholder="admin@apex.com" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone <span className="text-red-500">*</span></Label>
                <Input id="phone" name="phone" placeholder="9876543210" required />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input id="city" name="city" placeholder="Mumbai" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input id="state" name="state" placeholder="Maharashtra" />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {loading ? 'Creating Tenant...' : 'Create Tenant'}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="py-6 space-y-4">
            <div className="rounded-md bg-green-50 p-4 border border-green-200 dark:bg-green-900/10 dark:border-green-900/20">
              <div className="flex">
                <div className="flex-shrink-0">
                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" aria-hidden="true" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-green-800 dark:text-green-300">Tenant Created Successfully</h3>
                  <div className="mt-2 text-sm text-green-700 dark:text-green-400">
                    <p>Share these temporary credentials with the lab owner. They are valid immediately.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3 border rounded-lg p-4 bg-muted/50">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Login Email:</span>
                <div className="flex items-center gap-2">
                  <code className="text-sm font-mono font-bold select-all">{credentials.email}</code>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => {
                     navigator.clipboard.writeText(credentials.email);
                     toast.success('Email copied');
                  }}>
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Temp Password:</span>
                <div className="flex items-center gap-2">
                  <code className="text-sm font-mono font-bold bg-background px-2 py-1 rounded border select-all">
                    {credentials.tempPassword}
                  </code>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => {
                     navigator.clipboard.writeText(credentials.tempPassword);
                     toast.success('Password copied');
                  }}>
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>

            <Button className="w-full" onClick={handleClose}>Done & Close</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}