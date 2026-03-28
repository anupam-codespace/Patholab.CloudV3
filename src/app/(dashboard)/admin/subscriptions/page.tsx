'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  ColumnDef, flexRender, getCoreRowModel, useReactTable, getPaginationRowModel 
} from '@tanstack/react-table';
import { 
  CreditCard, Search, Filter, MoreHorizontal, Download, 
  RefreshCcw, AlertTriangle, CheckCircle2, XCircle, Clock, FileText, ExternalLink
} from 'lucide-react';
import { format, addDays } from 'date-fns';
import toast from 'react-hot-toast';

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, 
  DropdownMenuSeparator, DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle
} from "@/components/ui/sheet";
import { ScrollArea } from '@/components/ui/scroll-area';

// --- UTILS ---
const formatCurrency = (val: number) => 
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

// --- TYPES ---
type Subscription = {
  id: string;
  status: 'ACTIVE' | 'TRIAL' | 'PAST_DUE' | 'CANCELLED';
  startDate: string;
  endDate: string;
  lab: { name: string; email: string; city: string };
  plan: { displayName: string; price: number; billingCycle: string };
  payments: { amount: number; status: string; createdAt: string; razorpayPaymentId: string }[];
};

export default function AdminSubscriptionsPage() {
  // State
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedSub, setSelectedSub] = useState<Subscription | null>(null);

  // 1. Fetch Data
  const { data, isLoading } = useQuery({
    queryKey: ['admin-subs', page, search, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        search,
        status: statusFilter
      });
      const res = await fetch(`/api/admin/subscriptions?${params}`);
      return res.json();
    },
    placeholderData: (prev) => prev
  });

  // 2. Table Config
  const columns: ColumnDef<Subscription>[] = [
    {
      accessorKey: 'lab',
      header: 'Subscriber (Lab)',
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-medium text-sm">{row.original.lab.name}</span>
          <span className="text-xs text-muted-foreground">{row.original.lab.email}</span>
        </div>
      ),
    },
    {
      accessorKey: 'plan',
      header: 'Current Plan',
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-medium text-sm">{row.original.plan.displayName}</span>
          <span className="text-xs text-muted-foreground">
            {formatCurrency(row.original.plan.price)} / {row.original.plan.billingCycle.toLowerCase()}
          </span>
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.original.status;
        const styles = {
          ACTIVE: 'bg-green-100 text-green-700 border-green-200',
          TRIAL: 'bg-blue-100 text-blue-700 border-blue-200',
          PAST_DUE: 'bg-orange-100 text-orange-700 border-orange-200',
          CANCELLED: 'bg-red-100 text-red-700 border-red-200',
        };
        return (
          <Badge variant="outline" className={`${styles[status as keyof typeof styles]} border`}>
            {status.replace('_', ' ')}
          </Badge>
        );
      },
    },
    {
      header: 'Renewal Date',
      cell: ({ row }) => {
        const date = new Date(row.original.endDate);
        const isUrgent = date < addDays(new Date(), 7);
        return (
          <div className={`flex items-center gap-2 ${isUrgent ? 'text-orange-600 font-medium' : 'text-muted-foreground'}`}>
            <Clock className="h-3 w-3" />
            <span className="text-xs">{format(date, 'MMM dd, yyyy')}</span>
          </div>
        );
      }
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={() => setSelectedSub(row.original)}>
            View History
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Subscription Actions</DropdownMenuLabel>
              <DropdownMenuItem><RefreshCcw className="mr-2 h-4 w-4" /> Sync Status</DropdownMenuItem>
              <DropdownMenuItem><FileText className="mr-2 h-4 w-4" /> Send Invoice</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600"><XCircle className="mr-2 h-4 w-4" /> Cancel Subscription</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  const table = useReactTable({
    data: data?.data || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: true,
    pageCount: data?.meta?.totalPages || 0,
  });

  return (
    <div className="space-y-6 p-8 min-h-screen bg-muted/5">
      
      {/* HEADER & KPI */}
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Subscriptions & Billing</h1>
          <p className="text-muted-foreground">Monitor recurring revenue, renewals, and churn.</p>
        </div>

        {data?.stats && (
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="bg-gradient-to-br from-blue-50 to-white border-blue-100">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-blue-900">Monthly Recurring Revenue (MRR)</CardTitle>
                <CreditCard className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-700">{formatCurrency(data.stats.mrr)}</div>
                <p className="text-xs text-blue-600/80">Estimated monthly income</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Active Subscribers</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.stats.activeCount}</div>
                <p className="text-xs text-muted-foreground">Labs currently paying</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Churn (Last 30 Days)</CardTitle>
                <AlertTriangle className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.stats.churnCount}</div>
                <p className="text-xs text-muted-foreground">Cancellations this month</p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* FILTERS */}
      <div className="flex items-center justify-between bg-card p-4 rounded-lg border shadow-sm">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search labs..." 
              className="pl-9" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
              <SelectValue placeholder="Filter Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="TRIAL">Trialing</SelectItem>
              <SelectItem value="PAST_DUE">Past Due</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" /> Export CSV
        </Button>
      </div>

      {/* TABLE */}
      <div className="rounded-md border bg-card">
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
               <TableRow><TableCell colSpan={5} className="h-24 text-center">Loading subscriptions...</TableCell></TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow><TableCell colSpan={5} className="h-24 text-center">No subscriptions found.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* PAGINATION */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
        <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= (data?.meta?.totalPages || 1)}>Next</Button>
      </div>

      {/* DETAIL SLIDE-OVER (SHEET) */}
      <Sheet open={!!selectedSub} onOpenChange={() => setSelectedSub(null)}>
        <SheetContent className="sm:max-w-md w-full">
          <SheetHeader>
            <SheetTitle>Subscription Details</SheetTitle>
            <SheetDescription>Financial history for {selectedSub?.lab.name}</SheetDescription>
          </SheetHeader>
          
          {selectedSub && (
            <div className="mt-6 space-y-6">
              
              {/* Summary Box */}
              <div className="p-4 rounded-lg bg-muted/50 space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Plan</span>
                  <span className="font-medium">{selectedSub.plan.displayName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Billing Cycle</span>
                  <span className="font-medium">{selectedSub.plan.billingCycle}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Next Renewal</span>
                  <span className="font-medium">{format(new Date(selectedSub.endDate), 'MMM dd, yyyy')}</span>
                </div>
              </div>

              {/* Payment History List */}
              <div>
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Clock className="h-4 w-4" /> Transaction History
                </h4>
                <ScrollArea className="h-[300px] pr-4">
                  <div className="space-y-4">
                    {selectedSub.payments.length > 0 ? selectedSub.payments.map((pay: any, i: number) => (
                      <div key={i} className="flex items-center justify-between p-3 border rounded-lg bg-card hover:bg-accent/50 transition-colors">
                        <div className="space-y-1">
                          <p className="text-sm font-medium">{pay.status}</p>
                          <p className="text-xs text-muted-foreground">{format(new Date(pay.createdAt), 'MMM dd, yyyy')}</p>
                          <p className="text-[10px] text-muted-foreground font-mono">{pay.razorpayPaymentId || 'N/A'}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">{formatCurrency(pay.amount)}</p>
                          <Button variant="link" size="sm" className="h-auto p-0 text-[10px]">Invoice</Button>
                        </div>
                      </div>
                    )) : (
                      <div className="text-center text-sm text-muted-foreground py-8">No payment history found.</div>
                    )}
                  </div>
                </ScrollArea>
              </div>

              <div className="pt-4 border-t">
                <Button className="w-full" variant="secondary">
                  <ExternalLink className="mr-2 h-4 w-4" /> View Full Lab Profile
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

    </div>
  );
}