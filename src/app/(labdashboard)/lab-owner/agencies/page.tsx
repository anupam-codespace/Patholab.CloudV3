'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { getAgencies, createAgency, updateAgency, deleteAgency } from '@/actions/agency-management';
import { getTests } from '@/actions/test-catalog'; 
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Trash2, Pencil, Building2, Phone, Percent, IndianRupee, UserCircle, Eye, FileText, CheckCircle2, Clock, Check, Loader2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

// --- 1. TYPES & ZOD SCHEMA ---
const customCommissionSchema = z.object({
  testTemplateId: z.string(),
  testName: z.string(),
  commissionRate: z.coerce.number().min(0, "Must be >= 0"),
  commissionType: z.enum(['PERCENTAGE', 'FIXED'])
});

const agencySchema = z.object({
  agencyName: z.string().min(1, "Agency name is required"),
  contactPerson: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal('')),
  panNumber: z.string().optional(),
  commissionRate: z.coerce.number().min(0, "Must be >= 0").default(0),
  commissionType: z.enum(['PERCENTAGE', 'FIXED']).default('PERCENTAGE'),
  customCommissions: z.array(customCommissionSchema).default([])
});

type AgencyFormData = z.infer<typeof agencySchema>;

export default function AgenciesPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [testSearch, setTestSearch] = useState('');
  
  // Modals State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [editingAgencyId, setEditingAgencyId] = useState<string | null>(null);
  const [viewingAgency, setViewingAgency] = useState<any>(null);

  // Queries
  const { data: agencies = [], isLoading, isError } = useQuery({
    queryKey: ['agencies'],
    queryFn: async () => await getAgencies()
  });

  const { data: allTests = [] } = useQuery({
    queryKey: ['tests'],
    queryFn: async () => await getTests(),
    staleTime: 1000 * 60 * 5 // 5 minutes
  });

  // React Hook Form Setup
  const { register, control, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<AgencyFormData>({
    resolver: zodResolver(agencySchema),
    defaultValues: {
      agencyName: '', contactPerson: '', phone: '', email: '', panNumber: '',
      commissionRate: 5, commissionType: 'PERCENTAGE', customCommissions: []
    }
  });

  const { fields: customCommissions, append, remove, update } = useFieldArray({
    control,
    name: "customCommissions"
  });

  // Mutations
  const saveMutation = useMutation({
    mutationFn: async (payload: AgencyFormData) => {
      if (editingAgencyId) {
        await updateAgency(editingAgencyId, payload);
      } else {
        await createAgency(payload);
      }
    },
    onSuccess: () => {
      toast.success(editingAgencyId ? "Agency updated!" : "Agency added successfully!");
      setIsDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['agencies'] });
    },
    onError: () => toast.error("Failed to save agency details.")
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => await deleteAgency(id),
    onSuccess: () => {
      toast.success("Agency deleted");
      queryClient.invalidateQueries({ queryKey: ['agencies'] });
    }
  });

  // Handlers
  const handleAddNew = () => {
    setEditingAgencyId(null);
    reset({
      agencyName: '', contactPerson: '', phone: '', email: '', panNumber: '',
      commissionRate: 5, commissionType: 'PERCENTAGE', customCommissions: []
    });
    setIsDialogOpen(true);
  };

  const handleEdit = (agency: any) => {
    setEditingAgencyId(agency.id);
    reset({
      agencyName: agency.agencyName, 
      contactPerson: agency.contactPerson || '', 
      phone: agency.phone || '', 
      email: agency.email || '', 
      panNumber: agency.panNumber || '',
      commissionRate: agency.commissionRate || 0, 
      commissionType: agency.commissionType || 'PERCENTAGE',
      customCommissions: agency.customTestCommissions || []
    });
    setIsDialogOpen(true);
  };

  const handleView = (agency: any) => {
    setViewingAgency(agency);
    setIsViewOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to delete this agency? All historical data will be retained for accounting.")) {
      deleteMutation.mutate(id);
    }
  };

  const onSubmit = (data: AgencyFormData) => {
    saveMutation.mutate(data);
  };

  const addCustomTestRate = (test: any) => {
    const currentCommissions = watch('customCommissions');
    if (currentCommissions.some(c => c.testTemplateId === test.id)) {
        return toast.error("This test already has a custom rate.");
    }
    append({ 
      testTemplateId: test.id, 
      testName: test.name, 
      commissionRate: 0, 
      commissionType: 'FIXED' 
    });
    setTestSearch(''); 
  };

  const filteredAgencies = agencies.filter((a: any) => 
    a.agencyName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    a.phone?.includes(searchTerm)
  );

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-200 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">B2B Agencies</h1>
          <p className="text-sm text-slate-500 mt-1">Manage collection centers, hospitals, and their payout rules.</p>
        </div>
        <Button onClick={handleAddNew} className="bg-blue-600 hover:bg-blue-700 text-white shadow-md">
          <Plus className="h-4 w-4 mr-2" /> Add Agency
        </Button>
      </div>

      {/* SEARCH BAR */}
      <div className="relative w-full max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
        <input
          type="text"
          placeholder="Search by agency name or phone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all shadow-sm"
        />
      </div>

      {/* AGENCIES TABLE */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/80">
              <TableRow>
                <TableHead className="font-semibold text-slate-600">Agency Details</TableHead>
                <TableHead className="font-semibold text-slate-600">Contact Person</TableHead>
                <TableHead className="font-semibold text-slate-600">Commission Rule</TableHead>
                <TableHead className="font-semibold text-slate-600">Total Referrals</TableHead>
                <TableHead className="font-semibold text-slate-600 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-10 text-slate-500"><Loader2 className="h-6 w-6 animate-spin mx-auto mb-2"/> Loading agencies...</TableCell></TableRow>
              ) : isError ? (
                <TableRow>
                   <TableCell colSpan={5} className="text-center h-24 text-red-500">
                     <div className="flex items-center justify-center gap-2">
                       <AlertCircle className="h-4 w-4" /> Failed to load agencies. Please refresh.
                     </div>
                   </TableCell>
                 </TableRow>
              ) : filteredAgencies.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-10 text-slate-500">No B2B agencies found in your network.</TableCell></TableRow>
              ) : (
                filteredAgencies.map((agency: any) => (
                  <TableRow key={agency.id} className="hover:bg-slate-50/50">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-indigo-50 text-indigo-700 rounded-full flex items-center justify-center font-bold shrink-0">
                          <Building2 className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-900">{agency.agencyName}</div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">PAN: {agency.panNumber || 'N/A'}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-medium text-slate-700 flex items-center gap-1.5"><UserCircle className="h-3.5 w-3.5 text-slate-400"/> {agency.contactPerson || '-'}</div>
                      <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-1"><Phone className="h-3 w-3 text-slate-400"/> {agency.phone || '-'}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col items-start gap-1">
                          <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-bold ${agency.commissionType === 'PERCENTAGE' ? 'bg-purple-50 text-purple-700' : 'bg-emerald-50 text-emerald-700'}`}>
                            {agency.commissionType === 'PERCENTAGE' ? <Percent className="h-3 w-3 mr-1"/> : <IndianRupee className="h-3 w-3 mr-1"/>}
                            {agency.commissionRate} {agency.commissionType === 'PERCENTAGE' ? '%' : 'Flat'} (Profile Default)
                          </span>
                          {agency.customTestCommissions?.length > 0 && (
                              <span className="text-[10px] text-blue-600 font-bold bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                                  {agency.customTestCommissions.length} Custom Test Rates
                              </span>
                          )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-bold text-slate-800">{agency._count?.tests || 0} Tests</div>
                      <div className="text-xs text-slate-500 font-bold text-orange-600">Lifetime Generated: ₹{(agency.totalCommission || 0).toFixed(2)}</div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleView(agency)} className="text-slate-400 hover:text-indigo-600 bg-indigo-50/0 hover:bg-indigo-50"><Eye className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(agency)} className="text-slate-400 hover:text-blue-600"><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(agency.id)} disabled={deleteMutation.isPending && deleteMutation.variables === agency.id} className="text-slate-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* DETAILED VIEW MODAL (LEDGER) - UNCHANGED */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-4xl bg-slate-50">
          <DialogHeader className="bg-white p-4 -mx-6 -mt-6 border-b rounded-t-lg shadow-sm">
            <div className="flex items-center gap-3">
               <div className="h-12 w-12 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center">
                  <Building2 className="h-6 w-6" />
               </div>
               <div>
                  <DialogTitle className="text-xl">{viewingAgency?.agencyName}</DialogTitle>
                  <DialogDescription>{viewingAgency?.contactPerson} | {viewingAgency?.phone}</DialogDescription>
               </div>
            </div>
            
            <div className="flex gap-6 mt-4">
                <div className="bg-slate-50 px-4 py-2 rounded-lg border">
                    <p className="text-[10px] text-slate-500 font-bold uppercase">Total Referrals</p>
                    <p className="text-lg font-black text-slate-800">{viewingAgency?._count?.tests || 0}</p>
                </div>
                <div className="bg-orange-50 px-4 py-2 rounded-lg border border-orange-100">
                    <p className="text-[10px] text-orange-600 font-bold uppercase">Lifetime Commission Generated</p>
                    <p className="text-lg font-black text-orange-700">₹{(viewingAgency?.totalCommission || 0).toLocaleString()}</p>
                </div>
            </div>
          </DialogHeader>

          <div className="mt-4">
            <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2"><FileText className="w-4 h-4"/> Referral & Commission Ledger</h3>
            <div className="bg-white rounded-xl border shadow-sm max-h-[400px] overflow-y-auto">
                <Table>
                    <TableHeader className="sticky top-0 bg-slate-100 z-10 shadow-sm">
                        <TableRow>
                            <TableHead className="text-xs">Date</TableHead>
                            <TableHead className="text-xs">Patient</TableHead>
                            <TableHead className="text-xs">Test Name</TableHead>
                            <TableHead className="text-xs text-right">Commission Earned</TableHead>
                            <TableHead className="text-xs text-right">Payment Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {viewingAgency?.commissions?.length === 0 || !viewingAgency?.commissions ? (
                            <TableRow><TableCell colSpan={5} className="text-center py-8 text-slate-400">No referrals logged yet.</TableCell></TableRow>
                        ) : (
                            viewingAgency?.commissions?.map((comm: any) => (
                                <TableRow key={comm.id} className="hover:bg-slate-50">
                                    <TableCell className="text-xs text-slate-500 font-mono">
                                        {new Date(comm.test.createdAt).toLocaleDateString()}
                                    </TableCell>
                                    <TableCell className="font-medium text-sm text-slate-800">
                                        {comm.test.patient?.name || 'Unknown Patient'}
                                    </TableCell>
                                    <TableCell>
                                        <div className="text-xs font-bold text-slate-700">{comm.test.testName}</div>
                                        <div className="text-[10px] text-slate-400">{comm.test.testNumber}</div>
                                    </TableCell>
                                    <TableCell className="text-right font-bold text-slate-800">
                                        ₹{comm.amount.toLocaleString()}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {comm.status === 'PAID' ? (
                                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><CheckCircle2 className="w-3 h-3 mr-1"/> Paid</Badge>
                                        ) : (
                                            <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200"><Clock className="w-3 h-3 mr-1"/> Pending</Badge>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ✅ UPDATED ADD / EDIT MODAL WITH TABS */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-2">
            <DialogTitle>{editingAgencyId ? 'Edit Agency Profile' : 'Add New Agency'}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col">
            <Tabs defaultValue="basic" className="w-full">
              <div className="px-6 border-b border-slate-100">
                  <TabsList className="bg-slate-50/50 w-full justify-start p-0 h-auto gap-4 rounded-none">
                    <TabsTrigger value="basic" className={`rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent py-3 px-1 text-sm font-semibold ${errors.agencyName ? 'text-red-500' : ''}`}>
                        Basic & Default Margins {errors.agencyName && '*'}
                    </TabsTrigger>
                    <TabsTrigger value="custom" className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent py-3 px-1 text-sm font-semibold flex items-center gap-2 text-indigo-600">
                        Custom Test Rates <Badge className="bg-indigo-100 text-indigo-700 border-none text-[10px] h-4 px-1.5">{customCommissions.length}</Badge>
                    </TabsTrigger>
                  </TabsList>
              </div>

              {/* TAB 1: BASIC PROFILE */}
              <TabsContent value="basic" className="p-6 pt-4 space-y-4 m-0">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700">Agency Name *</label>
                    <Input placeholder="e.g. City Care Hospital" {...register("agencyName")} className={errors.agencyName ? "border-red-500 bg-red-50" : ""} />
                    {errors.agencyName && <span className="text-[10px] text-red-500 font-bold">{errors.agencyName.message}</span>}
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700">Contact Person</label>
                    <Input placeholder="e.g. Mr. Sharma" {...register("contactPerson")} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700">Phone Number</label>
                    <Input placeholder="9876543210" {...register("phone")} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700">Email Address</label>
                    <Input type="email" placeholder="agency@example.com" {...register("email")} className={errors.email ? "border-red-500 bg-red-50" : ""} />
                    {errors.email && <span className="text-[10px] text-red-500 font-bold">{errors.email.message}</span>}
                  </div>
                </div>
                
                <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700">PAN Number</label>
                    <Input placeholder="ABCDE1234F" className="uppercase font-mono" {...register("panNumber")} onChange={(e) => {
                         // Force uppercase while typing
                         setValue('panNumber', e.target.value.toUpperCase());
                    }}/>
                    <p className="text-[10px] text-slate-500">Optional: Used for corporate TDS accounting.</p>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4 mt-2">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    Profile Default Commission
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Commission Type</label>
                      <Select defaultValue={watch('commissionType')} onValueChange={(v: any) => setValue('commissionType', v)}>
                        <SelectTrigger className="bg-white"><SelectValue/></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PERCENTAGE">Percentage (%)</SelectItem>
                          <SelectItem value="FIXED">Flat Rate (₹)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Rate / Amount</label>
                      <Input type="number" step="0.01" min="0" {...register("commissionRate")} className={`bg-white font-bold ${errors.commissionRate ? "border-red-500" : ""}`} />
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-tight">
                    This is the fallback rate. If a test does not have a specific custom rate assigned in the next tab, this default rule will apply.
                  </p>
                </div>
              </TabsContent>

              {/* TAB 2: CUSTOM TEST RATES */}
              <TabsContent value="custom" className="p-6 pt-4 space-y-4 m-0">
                  <div className="relative z-10">
                     <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                     <Input 
                        placeholder="Search to add a specific test..." 
                        className="pl-9 bg-slate-50 border-slate-200"
                        value={testSearch}
                        onChange={(e) => setTestSearch(e.target.value)}
                     />
                     {testSearch && (
                        <div className="absolute top-11 left-0 w-full bg-white border border-slate-200 rounded-lg shadow-xl max-h-48 overflow-y-auto z-50">
                            {allTests?.filter((t: any) => t.name.toLowerCase().includes(testSearch.toLowerCase())).slice(0, 10).map((t: any) => (
                                <div 
                                    key={t.id} 
                                    onClick={() => addCustomTestRate(t)}
                                    className="p-3 text-sm border-b last:border-0 hover:bg-indigo-50 cursor-pointer flex justify-between items-center"
                                >
                                    <span className="font-semibold text-slate-700">{t.name}</span>
                                    <span className="text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-500 font-mono">₹{t.price}</span>
                                </div>
                            ))}
                        </div>
                     )}
                  </div>

                  <div className="border rounded-xl bg-white overflow-hidden">
                      <Table>
                          <TableHeader className="bg-slate-50">
                              <TableRow>
                                  <TableHead className="text-xs font-bold h-9">Test Name</TableHead>
                                  <TableHead className="text-xs font-bold h-9 w-32">Type</TableHead>
                                  <TableHead className="text-xs font-bold h-9 w-28">Margin</TableHead>
                                  <TableHead className="h-9 w-10"></TableHead>
                              </TableRow>
                          </TableHeader>
                          <TableBody>
                              {customCommissions.length === 0 ? (
                                  <TableRow>
                                      <TableCell colSpan={4} className="text-center py-6 text-sm text-slate-500 bg-slate-50/30">
                                          No custom rates. The profile default will be used for all tests.
                                      </TableCell>
                                  </TableRow>
                              ) : (
                                  customCommissions.map((cc, index) => (
                                      <TableRow key={cc.id}>
                                          <TableCell className="font-semibold text-sm">
                                            <input type="hidden" {...register(`customCommissions.${index}.testTemplateId`)} />
                                            <input type="hidden" {...register(`customCommissions.${index}.testName`)} />
                                            {cc.testName}
                                          </TableCell>
                                          <TableCell>
                                              <Select defaultValue={cc.commissionType} onValueChange={(v: any) => setValue(`customCommissions.${index}.commissionType`, v)}>
                                                  <SelectTrigger className="h-8 text-xs bg-slate-50"><SelectValue/></SelectTrigger>
                                                  <SelectContent>
                                                      <SelectItem value="PERCENTAGE">Percentage (%)</SelectItem>
                                                      <SelectItem value="FIXED">Flat (₹)</SelectItem>
                                                  </SelectContent>
                                              </Select>
                                          </TableCell>
                                          <TableCell>
                                              <Input 
                                                  type="number" 
                                                  step="0.01" 
                                                  className="h-8 text-xs font-bold" 
                                                  {...register(`customCommissions.${index}.commissionRate`)}
                                              />
                                          </TableCell>
                                          <TableCell>
                                              <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="h-7 w-7 text-slate-400 hover:text-red-600 hover:bg-red-50">
                                                  <Trash2 className="h-3 w-3" />
                                              </Button>
                                          </TableCell>
                                      </TableRow>
                                  ))
                              )}
                          </TableBody>
                      </Table>
                  </div>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-2 p-6 pt-4 border-t border-slate-100 bg-slate-50/50">
              <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 shadow-md" disabled={isSubmitting || saveMutation.isPending}>
                {(isSubmitting || saveMutation.isPending) ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : <Check className="h-4 w-4 mr-2" />}
                {editingAgencyId ? 'Update Profile' : 'Save Agency'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  );
}