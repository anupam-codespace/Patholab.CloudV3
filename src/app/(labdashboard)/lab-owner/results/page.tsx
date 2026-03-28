'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Plus, Search, Edit, Trash2, Download, RefreshCw, 
  CheckCircle2, FlaskConical, ShieldCheck, Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

// UI Components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// --- MAIN PAGE COMPONENT ---
export default function ResultsManagementPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  // 1. FETCH TESTS (Note: Ensure your API route for fetching patient tests is correct)
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['patient-tests', search, page],
    queryFn: async () => {
      // You might need to check if this API route conflicts with the new "parameters" route.
      // Ideally, rename the API for patient tests to /api/lab-owner/accessions or similar
      const params = new URLSearchParams({ page: page.toString(), limit: '20', search });
      const res = await fetch(`/api/lab-owner/tests?${params}`); 
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    // keepPreviousData: true // Note: keepPreviousData is deprecated in v5, use placeholderData if needed
  });

  // 2. APPROVAL MUTATION
  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string, status: string }) => {
      const res = await fetch(`/api/lab-owner/tests/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
      });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['patient-tests'] });
      toast.success(`Test marked as ${variables.status}`);
    },
    onError: () => toast.error('Action failed')
  });

  // 3. DELETE MUTATION
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
       await fetch(`/api/lab-owner/tests/${id}`, { method: 'DELETE' });
    },
    onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ['patient-tests'] });
       toast.success('Deleted successfully');
    }
  });

  // WORKFLOW HANDLER
  const handleApproval = (id: string, currentStatus: string) => {
    if (currentStatus === 'PENDING' || currentStatus === 'IN_PROGRESS') {
       // Technician Step
       statusMutation.mutate({ id, status: 'COMPLETED' }); 
       toast.loading("Completing technical entry...");
    } else if (currentStatus === 'COMPLETED') {
       // Doctor Step
       statusMutation.mutate({ id, status: 'APPROVED' });
       toast.loading("Doctor approving...");
    }
  };

  return (
    <div className="flex flex-col space-y-6 h-full p-6 bg-slate-50/50 min-h-screen">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Test Workbench</h1>
          <p className="text-slate-500 text-sm">Manage results, technical entry, and doctor approvals.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()}><RefreshCw className="h-4 w-4 mr-2"/> Refresh</Button>
          <Link href="/lab-owner/tests/create">
            <Button className="bg-blue-600 hover:bg-blue-700 shadow-sm">
              <Plus className="mr-2 h-4 w-4" /> New Accession
            </Button>
          </Link>
        </div>
      </div>

      {/* Toolbar */}
      <Card className="shadow-sm border-slate-200">
        <CardContent className="p-4 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search Test ID, Patient Name..."
              className="pl-9 bg-slate-50"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <div className="bg-white rounded-xl border shadow-sm flex-1 overflow-hidden relative flex flex-col">
          <div className="overflow-auto flex-1">
            <Table>
              <TableHeader className="bg-slate-50 sticky top-0 z-10">
                  <TableRow>
                    <TableHead className="w-[120px] font-bold text-slate-700 text-xs">Test ID</TableHead>
                    <TableHead className="min-w-[200px] font-bold text-slate-700 text-xs">Patient</TableHead>
                    <TableHead className="font-bold text-slate-700 text-xs">Test Name</TableHead>
                    <TableHead className="w-[140px] font-bold text-slate-700 text-xs">Workflow Stage</TableHead>
                    <TableHead className="text-xs font-bold text-slate-700 text-right">Actions</TableHead>
                  </TableRow>
              </TableHeader>
              <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={6} className="h-32 text-center"><Loader2 className="animate-spin h-6 w-6 mx-auto text-blue-600"/></TableCell></TableRow>
                  ) : data?.data?.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="h-32 text-center text-slate-500">No records found</TableCell></TableRow>
                  ) : (
                    data?.data?.map((test: any) => (
                        <TableRow key={test.id} className="hover:bg-slate-50/50 group text-xs border-b border-slate-100">
                          
                          {/* ID */}
                          <TableCell className="py-3 font-medium align-top">
                              <div className="text-blue-600 font-bold">{test.testNumber}</div>
                              <div className="text-[10px] text-slate-400 mt-1">{format(new Date(test.createdAt), 'dd MMM yyyy')}</div>
                          </TableCell>

                          {/* Patient */}
                          <TableCell className="py-3 align-top">
                              <div className="flex gap-3">
                                <Avatar className="h-8 w-8 border bg-slate-50">
                                    <AvatarFallback className="text-[10px] font-bold text-slate-600">{test.patient.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <div className="font-bold text-slate-800 text-sm">{test.patient.name}</div>
                                    <div className="text-slate-500 mt-0.5">{test.patient.details}</div>
                                </div>
                              </div>
                          </TableCell>

                          {/* Test Name */}
                          <TableCell className="py-3 align-top font-medium text-slate-700">
                              {test.testName}
                              <div className="text-[10px] text-slate-400 font-normal mt-0.5">Code: {test.code}</div>
                          </TableCell>

                          {/* WORKFLOW STATUS (Visual Pipeline) */}
                          <TableCell className="py-3 align-top">
                              <WorkflowBadge status={test.status} />
                          </TableCell>

                          {/* ACTIONS */}
                          <TableCell className="py-3 align-top text-right">
                              <div className="flex justify-end items-center gap-1">
                                
                                {/* 1. WORKFLOW ACTION BUTTON */}
                                {test.status !== 'APPROVED' && test.status !== 'CANCELLED' && (
                                   <TooltipProvider>
                                     <Tooltip>
                                       <TooltipTrigger asChild>
                                          <Button 
                                            size="sm" 
                                            className={`h-7 px-2 text-[10px] gap-1 shadow-sm ${
                                              test.status === 'COMPLETED' 
                                                ? 'bg-purple-600 hover:bg-purple-700' // Doctor Color
                                                : 'bg-blue-600 hover:bg-blue-700'     // Tech Color
                                            }`}
                                            onClick={() => handleApproval(test.id, test.status)}
                                          >
                                            {test.status === 'COMPLETED' ? <ShieldCheck className="h-3 w-3"/> : <FlaskConical className="h-3 w-3"/>}
                                            {test.status === 'COMPLETED' ? 'Approve' : 'Results'}
                                          </Button>
                                       </TooltipTrigger>
                                       <TooltipContent>
                                          {test.status === 'COMPLETED' ? 'Doctor Approval (Finalize)' : 'Enter Results (Technician)'}
                                       </TooltipContent>
                                     </Tooltip>
                                   </TooltipProvider>
                                )}

                                {/* 2. REPORT DOWNLOAD (Only if Approved) */}
                                {test.status === 'APPROVED' && (
                                   <Button variant="outline" size="icon" className="h-7 w-7 text-green-600 border-green-200 hover:bg-green-50" title="Download Report">
                                      <Download className="h-3.5 w-3.5"/>
                                   </Button>
                                )}

                                {/* 3. MENU */}
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" className="h-7 w-7 p-0"><span className="sr-only">Open menu</span><Edit className="h-3.5 w-3.5 text-slate-400"/></Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                      <DropdownMenuLabel>Options</DropdownMenuLabel>
                                      <DropdownMenuSeparator />
                                      <Link href={`/lab-owner/tests/${test.id}/edit`}>
                                        <DropdownMenuItem><Edit className="mr-2 h-3.5 w-3.5"/> Edit Details</DropdownMenuItem>
                                      </Link>
                                      <DropdownMenuItem className="text-red-600" onClick={() => deleteMutation.mutate(test.id)}>
                                        <Trash2 className="mr-2 h-3.5 w-3.5"/> Delete
                                      </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>

                              </div>
                          </TableCell>

                        </TableRow>
                    ))
                  )}
              </TableBody>
            </Table>
          </div>
      </div>
    </div>
  );
}

// --- SUB-COMPONENT: WORKFLOW BADGE ---
function WorkflowBadge({ status }: { status: string }) {
  if (status === 'APPROVED') {
    return (
      <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200 gap-1 pl-1 pr-2">
        <CheckCircle2 className="h-3 w-3 fill-green-600 text-white" /> Verified
      </Badge>
    );
  }
  
  if (status === 'COMPLETED') {
    return (
      <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100 border-purple-200 gap-1 pl-1 pr-2">
        <ShieldCheck className="h-3 w-3" /> Doc Review
      </Badge>
    );
  }

  if (status === 'IN_PROGRESS' || status === 'PENDING') {
    return (
      <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50 gap-1 pl-1 pr-2">
        <FlaskConical className="h-3 w-3" /> Lab Work
      </Badge>
    );
  }

  return <Badge variant="outline">{status}</Badge>;
}