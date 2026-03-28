'use client';
export const dynamic = "force-dynamic";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
   Search, Plus, MoreHorizontal, FileText, FlaskConical, 
   Loader2, ChevronLeft, ChevronRight, Filter, Clock,
   Briefcase, Trash2, Edit, X, User, Phone, Fingerprint, 
   Stethoscope, Hash, ScanBarcode, SlidersHorizontal, 
   FileBadge
} from 'lucide-react';
import { differenceInHours, differenceInMinutes } from 'date-fns';
import toast from 'react-hot-toast';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
   DropdownMenu, DropdownMenuContent, DropdownMenuItem, 
   DropdownMenuTrigger, DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

// --- SEARCH CONFIG ---
const SEARCH_CRITERIA = [
   { id: 'all', label: 'Global Search', icon: Search },
   { id: 'patientId', label: 'Patient ID', icon: Fingerprint },
   { id: 'name', label: 'Patient Name', icon: User },
   { id: 'phone', label: 'Phone Number', icon: Phone },
   { id: 'sampleId', label: 'Sample ID', icon: FlaskConical },
   { id: 'testName', label: 'Test Name', icon: FileText },
   { id: 'invoiceId', label: 'Bill / Invoice No', icon: Hash },
   { id: 'doctor', label: 'Referral Doctor', icon: Stethoscope },
   { id: 'agency', label: 'Agency / Corporate', icon: Briefcase },
   { id: 'srfId', label: 'SRF ID', icon: FileBadge },
   { id: 'abha', label: 'ABHA Number', icon: ScanBarcode },
];

// --- UTILS ---
const getTAT = (date: string) => {
   if (!date) return '-';
   const start = new Date(date);
   const now = new Date();
   const hours = differenceInHours(now, start);
   const mins = differenceInMinutes(now, start) % 60;
   const colorClass = hours > 24 ? "text-red-600 bg-red-50" : hours > 12 ? "text-orange-600 bg-orange-50" : "text-green-700 bg-green-50";
   return (
      <div className={`flex items-center gap-1 text-[10px] font-bold ${colorClass} px-1.5 py-0.5 rounded border border-slate-100 w-fit`}>
         <Clock className="h-3 w-3"/> {hours.toString().padStart(2, '0')}:{mins.toString().padStart(2, '0')}
      </div>
   );
};

const getTestColor = (status: string) => {
   switch (status) {
      case 'APPROVED': return 'text-green-700 bg-green-50 border-green-200';
      case 'COMPLETED': return 'text-green-700 bg-green-50 border-green-200';
      case 'IN_PROGRESS': return 'text-orange-700 bg-orange-50 border-orange-200';
      case 'SAMPLE_COLLECTED': return 'text-orange-700 bg-orange-50 border-orange-200';
      case 'PENDING': 
      default: return 'text-red-700 bg-red-50 border-red-200';
   }
};

const getBillingStatus = (invoice: any) => {
   if (!invoice) return <Badge variant="outline" className="text-slate-400 border-dashed text-[10px]">UN-BILLED</Badge>;
   if (invoice.status === 'PAID') return <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200 text-[10px] px-2">PAID</Badge>;
   return <Badge className="bg-red-50 text-red-600 hover:bg-red-50 border-red-200 text-[10px] px-2">DUES</Badge>;
};

export default function PatientWorklistPage() {
   const router = useRouter();
   const queryClient = useQueryClient();
   
   const [searchQuery, setSearchQuery] = useState('');
   const [debouncedSearch, setDebouncedSearch] = useState('');
   const [searchField, setSearchField] = useState('all'); 
   const [isSearchOpen, setIsSearchOpen] = useState(false);

   const [isFilterOpen, setIsFilterOpen] = useState(false);
   const [filters, setFilters] = useState({
      dateFrom: '',
      dateTo: '',
      doctorId: 'ALL',
      agencyId: 'ALL',
      status: 'ALL'
   });
   const [appliedFilters, setAppliedFilters] = useState(filters);

   const [page, setPage] = useState(1);
   const [selectedIds, setSelectedIds] = useState<string[]>([]);

   const { data: filterOptions } = useQuery({
      queryKey: ['filterOptions'],
      queryFn: async () => {
         const [docsRes, agenciesRes] = await Promise.allSettled([
               fetch('/api/lab-owner/doctors').then(r => r.ok ? r.json() : []),
               fetch('/api/lab-owner/agencies').then(r => r.ok ? r.json() : [])
         ]);
         return {
               doctors: docsRes.status === 'fulfilled' ? docsRes.value : [],
               agencies: agenciesRes.status === 'fulfilled' ? agenciesRes.value : []
         };
      },
      staleTime: 1000 * 60 * 10 
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
      from: appliedFilters.dateFrom || '',
      to: appliedFilters.dateTo || '',
      doctor: appliedFilters.doctorId || '',
      agency: appliedFilters.agencyId || '',
      status: appliedFilters.status || ''
   }).toString();

   const { data, isLoading } = useQuery({
      queryKey: ['patients', queryParams], 
      queryFn: async () => {
         const res = await fetch(`/api/lab-owner/patients?${queryParams}`);
         if (!res.ok) throw new Error('Failed to fetch');
         return res.json();
      },
      placeholderData: (prev) => prev,
      refetchInterval: 5000, 
      staleTime: 0
   });

   const patients = data?.data || (Array.isArray(data) ? data : []);
   const totalRecords = data?.pagination?.total || 0;
   const totalPages = data?.pagination?.pages || 1;

   const deleteMutation = useMutation({
      mutationFn: async (id: string) => {
         const res = await fetch(`/api/lab-owner/patients/${id}`, { method: 'DELETE' });
         if (!res.ok) throw new Error("Delete failed");
      },
      onSuccess: () => {
         toast.success("Patient deleted");
         queryClient.invalidateQueries({ queryKey: ['patients'] });
      },
      onError: () => toast.error("Failed to delete")
   });

   const bulkDeleteMutation = useMutation({
      mutationFn: async (ids: string[]) => {
         const res = await fetch('/api/lab-owner/patients/bulk-delete', {
            method: 'POST',
            body: JSON.stringify({ ids })
         });
         if (!res.ok) throw new Error("Bulk delete failed");
         return res.json();
      },
      onSuccess: () => {
         toast.success(`Deleted selected patients`);
         setSelectedIds([]);
         queryClient.invalidateQueries({ queryKey: ['patients'] });
      }
   });

   const handleSelectAll = (checked: boolean) => {
      if (checked) setSelectedIds(patients.map((p: any) => p.id));
      else setSelectedIds([]);
   };

   const handleSelectOne = (id: string, checked: boolean) => {
      if (checked) setSelectedIds(prev => [...prev, id]);
      else setSelectedIds(prev => prev.filter(item => item !== id));
   };

   const handleDelete = (id: string) => {
         if (confirm("Are you sure?")) deleteMutation.mutate(id);
   };

   const handleBulkDelete = () => {
         if (confirm(`Delete ${selectedIds.length} items?`)) bulkDeleteMutation.mutate(selectedIds);
   };

   const applyFilters = () => {
      setAppliedFilters(filters);
      setPage(1);
      setIsFilterOpen(false);
   };

   const clearFilters = () => {
      const reset = { dateFrom: '', dateTo: '', doctorId: 'ALL', agencyId: 'ALL', status: 'ALL' };
      setFilters(reset);
      setAppliedFilters(reset);
      setPage(1);
      setIsFilterOpen(false);
   };

   const ActiveIcon = SEARCH_CRITERIA.find(c => c.id === searchField)?.icon || Search;
   const activeLabel = SEARCH_CRITERIA.find(c => c.id === searchField)?.label || 'Global Search';
   const activeFilterCount = [
      appliedFilters.dateFrom, appliedFilters.dateTo, 
      appliedFilters.doctorId !== 'ALL', appliedFilters.agencyId !== 'ALL', 
      appliedFilters.status !== 'ALL'
   ].filter(Boolean).length;

   return (
      <div className="flex flex-col h-[calc(100vh-4rem)] bg-slate-50/50 p-4 font-sans overflow-hidden">
         
         <div className="flex-none mb-4 flex justify-between items-center bg-white p-3 rounded-lg border border-slate-200 shadow-sm z-20">
            <div className="flex items-center gap-4">
               <h1 className="text-lg font-bold text-slate-800 tracking-tight flex items-center gap-2">
                  <FlaskConical className="h-5 w-5 text-blue-600"/> 
                  Accession List
                  <span className="text-xs font-normal text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{totalRecords}</span>
               </h1>
               
               <Popover open={isSearchOpen} onOpenChange={setIsSearchOpen}>
               <PopoverTrigger asChild>
                  <div className="relative w-80 group">
                     <div className="absolute left-2.5 top-2 text-slate-400 group-hover:text-blue-600 transition-colors">
                        <ActiveIcon className="h-4 w-4"/>
                     </div>
                     <Input 
                        placeholder={`Search by ${activeLabel}...`}
                        className="pl-9 pr-8 h-8 text-xs bg-slate-50 border-slate-200 focus:bg-white transition-all cursor-pointer ring-0 focus:ring-0"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onClick={() => setIsSearchOpen(true)} 
                     />
                     <div className="absolute right-2 top-2 text-slate-300">
                        <SlidersHorizontal className="h-4 w-4"/>
                     </div>
                  </div>
               </PopoverTrigger>
               <PopoverContent className="w-80 p-0 shadow-xl border-slate-200" align="start" sideOffset={5}>
                  <div className="bg-slate-50 p-3 border-b border-slate-100">
                     <h4 className="text-[10px] uppercase font-bold text-slate-500 mb-2">Select Search Field</h4>
                     <div className="relative">
                           <Input autoFocus placeholder="Type..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="h-8 text-xs bg-white border-slate-200 pl-8" />
                           <ActiveIcon className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400"/>
                     </div>
                  </div>
                  <div className="p-2 max-h-[300px] overflow-y-auto">
                     <RadioGroup value={searchField} onValueChange={(val) => { setSearchField(val); setIsSearchOpen(false); }}>
                        <div className="grid grid-cols-2 gap-1">
                           {SEARCH_CRITERIA.map((criteria) => (
                              <div key={criteria.id}>
                                 <RadioGroupItem value={criteria.id} id={criteria.id} className="peer sr-only" />
                                 <Label htmlFor={criteria.id} className="flex items-center gap-2 px-3 py-2 rounded-md border border-transparent cursor-pointer hover:bg-slate-50 peer-data-[state=checked]:bg-blue-50 peer-data-[state=checked]:border-blue-100 peer-data-[state=checked]:text-blue-700 transition-all">
                                    <criteria.icon className="h-3.5 w-3.5 opacity-70" />
                                    <span className="text-xs font-medium">{criteria.label}</span>
                                 </Label>
                              </div>
                           ))}
                        </div>
                     </RadioGroup>
                  </div>
               </PopoverContent>
               </Popover>

            </div>
            <div className="flex gap-2">
               
               <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                  <PopoverTrigger asChild>
                     <Button variant={activeFilterCount > 0 ? "secondary" : "outline"} size="sm" className={`h-8 text-xs gap-2 ${activeFilterCount > 0 ? 'text-blue-700 bg-blue-50 border-blue-200' : 'text-slate-600'}`}>
                        <Filter className="h-3 w-3"/> Filter
                        {activeFilterCount > 0 && <Badge className="h-4 px-1 bg-blue-600 text-[9px]">{activeFilterCount}</Badge>}
                     </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[350px] p-0 shadow-xl border-slate-200" align="end" sideOffset={5}>
                     <div className="bg-slate-50 p-3 border-b border-slate-100 flex items-center justify-between">
                        <h4 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                           <Filter className="h-3.5 w-3.5 text-blue-600"/>
                           Advanced Filters
                        </h4>
                        {activeFilterCount > 0 && (
                           <button onClick={clearFilters} className="text-[10px] text-red-500 hover:underline">Clear All</button>
                        )}
                     </div>
                     
                     <div className="p-4 space-y-4 max-h-[400px] overflow-y-auto">
                        <div className="space-y-2">
                           <Label className="text-[10px] font-bold text-slate-500 uppercase">Registration Date</Label>
                           <div className="grid grid-cols-2 gap-2">
                              <div>
                                 <Label className="text-[10px] text-slate-400">From</Label>
                                 <Input type="date" className="h-8 text-xs" value={filters.dateFrom} onChange={e => setFilters({...filters, dateFrom: e.target.value})} />
                              </div>
                              <div>
                                 <Label className="text-[10px] text-slate-400">To</Label>
                                 <Input type="date" className="h-8 text-xs" value={filters.dateTo} onChange={e => setFilters({...filters, dateTo: e.target.value})} />
                              </div>
                           </div>
                        </div>

                        <Separator/>

                        <div className="space-y-1">
                           <Label className="text-xs font-medium">Referral Doctor</Label>
                           <Select value={filters.doctorId} onValueChange={(val) => setFilters({...filters, doctorId: val})}>
                              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="All Doctors" /></SelectTrigger>
                              <SelectContent>
                                 <SelectItem value="ALL">All Doctors</SelectItem>
                                 {filterOptions?.doctors?.map((doc: any) => (
                                    <SelectItem key={doc.id} value={doc.id}>{doc.name}</SelectItem>
                                 ))}
                              </SelectContent>
                           </Select>
                        </div>

                        <div className="space-y-1">
                           <Label className="text-xs font-medium">Agency / Client</Label>
                           <Select value={filters.agencyId} onValueChange={(val) => setFilters({...filters, agencyId: val})}>
                              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="All Agencies" /></SelectTrigger>
                              <SelectContent>
                                 <SelectItem value="ALL">All Agencies</SelectItem>
                                 {filterOptions?.agencies?.map((ag: any) => (
                                    <SelectItem key={ag.id} value={ag.id}>{ag.agencyName}</SelectItem>
                                 ))}
                              </SelectContent>
                           </Select>
                        </div>

                        <div className="space-y-1">
                           <Label className="text-xs font-medium">Payment Status</Label>
                           <Select value={filters.status} onValueChange={(val) => setFilters({...filters, status: val})}>
                              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="All Status" /></SelectTrigger>
                              <SelectContent>
                                 <SelectItem value="ALL">All Status</SelectItem>
                                 <SelectItem value="PAID">Fully Paid</SelectItem>
                                 <SelectItem value="PENDING">Due / Pending</SelectItem>
                              </SelectContent>
                           </Select>
                        </div>
                     </div>

                     <div className="p-3 border-t bg-slate-50 flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setIsFilterOpen(false)} className="h-8 text-xs">Cancel</Button>
                        <Button onClick={applyFilters} size="sm" className="bg-blue-600 hover:bg-blue-700 h-8 text-xs">Apply Filters</Button>
                     </div>
                  </PopoverContent>
               </Popover>

               <Button onClick={() => router.push('/lab-owner/registration')} className="bg-blue-600 hover:bg-blue-700 h-8 text-xs font-bold shadow-sm"><Plus className="h-3 w-3 mr-1"/> New Registration</Button>
            </div>
         </div>

         {selectedIds.length > 0 && (
            <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 bg-slate-900 text-white px-6 py-2 rounded-full shadow-xl flex items-center gap-4 animate-in slide-in-from-top-2">
               <span className="text-xs font-bold">{selectedIds.length} Selected</span>
               <Separator orientation="vertical" className="h-4 bg-slate-700"/>
               <button onClick={handleBulkDelete} className="text-xs text-red-400 hover:text-red-300 font-bold flex items-center gap-1"><Trash2 className="h-3 w-3"/> Delete Selected</button>
               <button onClick={() => setSelectedIds([])} className="ml-2 text-slate-400 hover:text-white"><X className="h-4 w-4"/></button>
            </div>
         )}

         <Card className="flex-1 flex flex-col shadow-sm border-slate-200 overflow-hidden rounded-lg">
            <div className="flex-1 overflow-auto relative">
               <table className="w-full text-xs text-left border-collapse">
                  <thead className="sticky top-0 z-10 bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200 shadow-sm">
                     <tr>
                        <th className="px-4 py-3 w-10 bg-slate-50">
                           <Checkbox checked={patients.length > 0 && selectedIds.length === patients.length} onCheckedChange={(c) => handleSelectAll(!!c)} />
                        </th>
                        <th className="px-4 py-3 bg-slate-50">Patient ID</th>
                        <th className="px-4 py-3 bg-slate-50">Patient Details</th>
                        <th className="px-4 py-3 bg-slate-50">TAT</th>
                        <th className="px-4 py-3 bg-slate-50">Tests [Short]</th>
                        <th className="px-4 py-3 bg-slate-50">Ref. By</th>
                        <th className="px-4 py-3 text-center bg-slate-50">Billing</th>
                        <th className="px-4 py-3 text-right bg-slate-50">Action</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                     {isLoading ? (
                        <tr><td colSpan={8} className="h-40 text-center"><Loader2 className="animate-spin h-6 w-6 mx-auto text-blue-500"/></td></tr>
                     ) : patients.length === 0 ? (
                        <tr><td colSpan={8} className="h-32 text-center text-slate-400">No records found matching criteria.</td></tr>
                     ) : (
                        patients.map((patient: any) => {
                           const invoice = patient.invoices?.[0];
                           
                           // ✅ FIX: Prioritize actual relational names over the corrupted "referredBy" text column
                           let refDoc = patient.tests?.[0]?.doctor?.name 
                                     || patient.doctor?.name 
                                     || patient.tests?.[0]?.referredBy 
                                     || 'Self';
                           
                           let refAgency = patient.tests?.[0]?.agency?.agencyName 
                                        || patient.agency?.agencyName;
                           
                           // ✅ FRONTEND PATCH: Hide old ugly CUIDs that were saved before the fix
                           if (refDoc && refDoc.startsWith('c') && refDoc.length > 20 && !refDoc.includes(' ')) {
                               refDoc = 'Self';
                           }
                           if (refAgency && refAgency.startsWith('c') && refAgency.length > 20 && !refAgency.includes(' ')) {
                               refAgency = null;
                           }
                                          
                           const isSelected = selectedIds.includes(patient.id);

                           return (
                           <tr 
                              key={patient.id} 
                              className={`group transition-colors cursor-pointer ${isSelected ? 'bg-blue-50' : 'hover:bg-blue-50/30'}`}
                              onDoubleClick={() => router.push(`/lab-owner/patients/${patient.id}`)}
                           >
                              <td className="px-4 py-3"><Checkbox checked={isSelected} onCheckedChange={(c) => handleSelectOne(patient.id, !!c)} /></td>
                              <td className="px-4 py-3 font-mono font-medium text-slate-600">{patient.patientId}</td>
                              <td className="px-4 py-3">
                                 <div className="font-bold text-slate-800 text-sm">{patient.name}</div>
                                 <div className="text-[10px] text-slate-500 font-medium uppercase mt-0.5">{patient.age} {patient.ageUnit?.slice(0,1)} / {patient.gender?.charAt(0)}</div>
                              </td>
                              <td className="px-4 py-3">{getTAT(patient.tests?.[0]?.createdAt || patient.updatedAt)}</td>
                              
                              <td className="px-4 py-3">
                                 <div className="flex flex-wrap gap-1 max-w-[250px]">
                                    <TooltipProvider>
                                    {patient.tests?.map((t: any) => (
                                       <Tooltip key={t.id}>
                                          <TooltipTrigger><span className={`cursor-help px-1.5 py-0.5 rounded text-[9px] font-bold border ${getTestColor(t.status)}`}>{t.testCode}</span></TooltipTrigger>
                                          <TooltipContent className="bg-slate-800 text-white border-slate-700 text-xs p-2 shadow-xl"><p className="font-bold mb-1">{t.testName}</p><p className="text-slate-300 text-[10px]">Status: <span className="text-white font-mono">{t.status}</span></p></TooltipContent>
                                       </Tooltip>
                                    ))}
                                    </TooltipProvider>
                                    {(!patient.tests || patient.tests.length === 0) && <span className="text-slate-300 text-[10px] italic">No Tests</span>}
                                 </div>
                              </td>

                              <td className="px-4 py-3 text-slate-600">
                                 <div className="flex flex-col"><span className="font-medium truncate max-w-[120px]">{refDoc}</span>{refAgency && <span className="text-[9px] text-slate-400 flex items-center gap-1"><Briefcase className="h-2 w-2"/> {refAgency}</span>}</div>
                              </td>
                              <td className="px-4 py-3 text-center">
                                 <HoverCard>
                                    <HoverCardTrigger asChild><div className="cursor-pointer inline-block">{getBillingStatus(invoice)}</div></HoverCardTrigger>
                                    {invoice && (
                                    <HoverCardContent className="w-64 p-0 shadow-xl border-slate-200" align="end">
                                       <div className="bg-slate-50 px-3 py-2 border-b border-slate-100 text-xs font-bold text-slate-700">Bill Details</div>
                                       <div className="p-3 space-y-2 text-xs">
                                          <div className="flex justify-between"><span>Subtotal</span> <span>₹{invoice.subtotal}</span></div>
                                          <div className="flex justify-between font-bold text-slate-900"><span>Net Payable</span> <span>₹{invoice.grandTotal}</span></div>
                                          <div className="flex justify-between text-red-600 font-bold bg-red-50 px-1 rounded"><span>Due</span> <span>₹{invoice.status === 'PAID' ? 0 : invoice.grandTotal}</span></div>
                                       </div>
                                    </HoverCardContent>
                                    )}
                                 </HoverCard>
                              </td>
                              <td className="px-4 py-3 text-right">
                                 <DropdownMenu>
                                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-blue-600"><MoreHorizontal className="h-4 w-4"/></Button></DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-48">
                                       <Link href={`/lab-owner/workflow/results/${patient.id}`}><DropdownMenuItem className="cursor-pointer"><FlaskConical className="mr-2 h-4 w-4 text-purple-600"/> Enter Results</DropdownMenuItem></Link>
                                       {invoice && <Link href={`/lab-owner/billing/${invoice.id}`}><DropdownMenuItem className="cursor-pointer"><FileText className="mr-2 h-4 w-4 text-blue-600"/> View Bill</DropdownMenuItem></Link>}
                                       <DropdownMenuSeparator/>
                                       
                                       <Link href={`/lab-owner/patients/${patient.id}`}><DropdownMenuItem className="cursor-pointer"><Edit className="mr-2 h-4 w-4 text-slate-500"/> Edit Details</DropdownMenuItem></Link>
                                       
                                       <Link href={`/lab-owner/reports/print/${patient.id}`}><DropdownMenuItem>📄 View Report</DropdownMenuItem></Link>
                                       <DropdownMenuItem className="text-red-600 focus:text-red-600 cursor-pointer" onClick={() => handleDelete(patient.id)}><Trash2 className="mr-2 h-4 w-4"/> Delete Record</DropdownMenuItem>
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
            {/* PAGINATION */}
            <div className="flex-none p-3 border-t border-slate-200 flex justify-between items-center bg-slate-50 z-20">
               <div className="text-[10px] text-slate-500 font-medium">Showing Page {page} of {totalPages}</div>
               <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1} className="h-7 text-xs shadow-sm bg-white"><ChevronLeft className="h-3 w-3 mr-1"/> Prev</Button>
                  <Button variant="outline" size="sm" onClick={() => setPage(p => p+1)} disabled={page >= totalPages} className="h-7 text-xs shadow-sm bg-white">Next <ChevronRight className="h-3 w-3 ml-1"/></Button>
               </div>
            </div>
         </Card>
      </div>
   );
}