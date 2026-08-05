'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  ColumnDef, flexRender, getCoreRowModel, useReactTable, getPaginationRowModel 
} from '@tanstack/react-table';
import { 
  Users, Search, Filter, MoreHorizontal, Shield, 
  MapPin, Calendar, Lock, Trash2, Edit, CheckCircle2, XCircle
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';

// --- TYPES ---
type UserData = {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  lab?: {
    name: string;
    city: string;
    state: string;
  };
};

export default function GlobalUsersPage() {
  const queryClient = useQueryClient();
  
  // Filters State
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [stateFilter, setStateFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState('all');

  // Edit/Delete State
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);

  // 1. FETCH DATA
  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', page, search, roleFilter, statusFilter, stateFilter, yearFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        search,
        role: roleFilter,
        status: statusFilter,
        state: stateFilter,
        year: yearFilter
      });
      const res = await fetch(`/api/admin/users?${params}`);
      return res.json();
    },
    placeholderData: (prev) => prev
  });

  // 2. MUTATIONS
  const updateMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Update failed');
    },
    onSuccess: () => {
      toast.success('User updated successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setIsEditOpen(false);
    },
    onError: () => toast.error('Failed to update user')
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/users?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
    },
    onSuccess: () => {
      toast.success('User deleted');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: () => toast.error('Cannot delete this user')
  });

  // 3. TABLE COLUMNS
  const columns: ColumnDef<UserData>[] = [
    {
      accessorKey: 'name',
      header: 'User Profile',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9 border">
            <AvatarFallback className="bg-primary/10 text-primary font-bold">
              {row.original.name.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="font-medium text-sm">{row.original.name}</span>
            <span className="text-xs text-muted-foreground">{row.original.email}</span>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'role',
      header: 'Role',
      cell: ({ row }) => {
        const role = row.original.role;
        const color = role === 'SUPER_ADMIN' ? 'bg-purple-100 text-purple-700' :
                      role === 'LAB_OWNER' ? 'bg-blue-100 text-primary' : 
                      'bg-gray-100 text-gray-700';
        return (
          <Badge className={`${color} border-none shadow-none`}>
            {role.replace('_', ' ')}
          </Badge>
        );
      },
    },
    {
      id: 'location',
      header: 'Region / Lab',
      cell: ({ row }) => (
        row.original.lab ? (
          <div className="flex flex-col text-xs">
            <span className="font-medium">{row.original.lab.name}</span>
            <span className="text-muted-foreground flex items-center gap-1">
              <MapPin className="h-3 w-3" /> {row.original.lab.city}, {row.original.lab.state}
            </span>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground italic">System User</span>
        )
      ),
    },
    {
      accessorKey: 'createdAt',
      header: 'Joined',
      cell: ({ row }) => (
        <div className="text-xs text-muted-foreground flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          {format(new Date(row.original.createdAt), 'MMM dd, yyyy')}
        </div>
      ),
    },
    {
      accessorKey: 'isActive',
      header: 'Status',
      cell: ({ row }) => (
        row.original.isActive ? 
          <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">Active</Badge> : 
          <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50">Suspended</Badge>
      ),
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => { setEditingUser(row.original); setIsEditOpen(true); }}>
              <Edit className="mr-2 h-4 w-4" /> Edit Profile
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Lock className="mr-2 h-4 w-4" /> Reset Password
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-red-600" onClick={() => {
                if(confirm('Delete this user?')) deleteMutation.mutate(row.original.id)
            }}>
              <Trash2 className="mr-2 h-4 w-4" /> Delete User
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
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
      {/* --- STATS ROW --- */}
      {data?.stats && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.stats.totalUsers}</div>
              <p className="text-xs text-muted-foreground">Across all regions</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">New This Year</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.stats.newUsers}</div>
              <p className="text-xs text-muted-foreground">Growth in {new Date().getFullYear()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Available Regions</CardTitle>
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.stats.availableStates?.length || 0}</div>
              <p className="text-xs text-muted-foreground">States covered</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* --- FILTERS BAR --- */}
      <div className="flex flex-col xl:flex-row gap-4 items-end xl:items-center bg-background/50 p-4 rounded-lg border">
        
        {/* Search */}
        <div className="relative w-full xl:w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search users..." 
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 w-full">
            {/* Role Filter */}
            <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger>
                    <Filter className="mr-2 h-3 w-3" />
                    <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="LAB_OWNER">Lab Owners</SelectItem>
                    <SelectItem value="TECHNICIAN">Technicians</SelectItem>
                    <SelectItem value="RECEPTIONIST">Receptionists</SelectItem>
                </SelectContent>
            </Select>

            {/* Region Filter (Dynamic) */}
            <Select value={stateFilter} onValueChange={setStateFilter}>
                <SelectTrigger>
                    <MapPin className="mr-2 h-3 w-3" />
                    <SelectValue placeholder="Region" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Regions</SelectItem>
                    {data?.stats?.availableStates?.map((state: string) => (
                        <SelectItem key={state} value={state}>{state}</SelectItem>
                    ))}
                </SelectContent>
            </Select>

            {/* Year Filter */}
            <Select value={yearFilter} onValueChange={setYearFilter}>
                <SelectTrigger>
                    <Calendar className="mr-2 h-3 w-3" />
                    <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="2025">2025</SelectItem>
                    <SelectItem value="2024">2024</SelectItem>
                    <SelectItem value="2023">2023</SelectItem>
                </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                    <Shield className="mr-2 h-3 w-3" />
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

      {/* --- DATA TABLE --- */}
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
               <TableRow><TableCell colSpan={6} className="h-24 text-center">Loading users...</TableCell></TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow><TableCell colSpan={6} className="h-24 text-center">No users found.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* --- PAGINATION --- */}
      <div className="flex items-center justify-between py-4">
        <span className="text-sm text-muted-foreground">Showing page {page}</span>
        <div className="space-x-2">
          <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
          <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= (data?.meta?.totalPages || 1)}>Next</Button>
        </div>
      </div>

      {/* --- EDIT DIALOG --- */}
      {editingUser && (
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Edit User Profile</DialogTitle>
                    <DialogDescription>Update details for {editingUser.name}</DialogDescription>
                </DialogHeader>
                <form onSubmit={(e) => {
                    e.preventDefault();
                    const fd = new FormData(e.currentTarget);
                    updateMutation.mutate({
                        userId: editingUser.id,
                        name: fd.get('name'),
                        email: fd.get('email'),
                        role: fd.get('role'),
                        isActive: fd.get('status') === 'active'
                    });
                }}>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Name</Label>
                            <Input id="name" name="name" defaultValue={editingUser.name} className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Email</Label>
                            <Input id="email" name="email" defaultValue={editingUser.email} className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Role</Label>
                            <select name="role" defaultValue={editingUser.role} className="col-span-3 flex h-10 w-full rounded-md border bg-background px-3">
                                <option value="LAB_OWNER">Lab Owner</option>
                                <option value="TECHNICIAN">Technician</option>
                                <option value="RECEPTIONIST">Receptionist</option>
                            </select>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Status</Label>
                            <select name="status" defaultValue={editingUser.isActive ? 'active' : 'suspended'} className="col-span-3 flex h-10 w-full rounded-md border bg-background px-3">
                                <option value="active">Active</option>
                                <option value="suspended">Suspended</option>
                            </select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit">Save Changes</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
      )}
    </div>
  );
}