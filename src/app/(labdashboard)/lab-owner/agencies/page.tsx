'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAgencies, createAgency, updateAgency, deleteAgency } from '@/actions/agency-management';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, Search, Trash2, Pencil, Building2, Phone, Percent, 
  IndianRupee, UserCircle, Eye, FileText, CheckCircle2, Clock, 
  Check, Loader2, Sparkles, TrendingUp, Wallet, ShieldCheck, FileSpreadsheet
} from 'lucide-react';
import toast from 'react-hot-toast';

// Mock fetcher for tests (Preserved exactly as requested)
import { getTests } from '@/actions/test-catalog'; 

export default function AgenciesPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  
  const [editingAgency, setEditingAgency] = useState<any>(null);
  const [viewingAgency, setViewingAgency] = useState<any>(null);

  // Form States (Basic)
  const [formData, setFormData] = useState({
    agencyName: '', contactPerson: '', phone: '', email: '', panNumber: '',
    commissionRate: 0, commissionType: 'PERCENTAGE'
  });

  // State for Custom Test Commissions
  const [customCommissions, setCustomCommissions] = useState<any[]>([]);
  const [testSearch, setTestSearch] = useState('');

  // Queries
  const { data: agencies, isLoading } = useQuery({
    queryKey: ['agencies'],
    queryFn: async () => await getAgencies()
  });

  // Query to fetch all lab tests for the search bar
  const { data: allTests } = useQuery({
    queryKey: ['tests'],
    queryFn: async () => await getTests()
  });

  // Mutations
  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (editingAgency) {
        await updateAgency(editingAgency.id, payload);
      } else {
        await createAgency(payload);
      }
    },
    onSuccess: () => {
      toast.success(editingAgency ? "Agency updated successfully!" : "Agency added successfully!");
      setIsDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['agencies'] });
    },
    onError: () => toast.error("Failed to save agency details.")
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => await deleteAgency(id),
    onSuccess: () => {
      toast.success("Agency deleted securely");
      queryClient.invalidateQueries({ queryKey: ['agencies'] });
    }
  });

  // Handlers
  const handleAddNew = () => {
    setEditingAgency(null);
    setFormData({ agencyName: '', contactPerson: '', phone: '', email: '', panNumber: '', commissionRate: 5, commissionType: 'PERCENTAGE' });
    setCustomCommissions([]); 
    setIsDialogOpen(true);
  };

  const handleEdit = (agency: any) => {
    setEditingAgency(agency);
    setFormData({
      agencyName: agency.agencyName, 
      contactPerson: agency.contactPerson || '', 
      phone: agency.phone || '', 
      email: agency.email || '', 
      panNumber: agency.panNumber || '',
      commissionRate: agency.commissionRate || 0, 
      commissionType: agency.commissionType
    });
    setCustomCommissions(agency.customTestCommissions || []); 
    setIsDialogOpen(true);
  };

  const handleView = (agency: any) => {
    setViewingAgency(agency);
    setIsViewOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this agency? Historical ledger data will be safely retained.")) {
      deleteMutation.mutate(id);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.agencyName) return toast.error("Agency name is required");
    
    saveMutation.mutate({
      ...formData,
      commissionRate: Number(formData.commissionRate),
      customCommissions: customCommissions 
    });
  };

  const addCustomTestRate = (test: any) => {
    if (customCommissions.some(c => c.testTemplateId === test.id)) {
        return toast.error("This test already has a custom rate defined.");
    }
    setCustomCommissions([
        ...customCommissions, 
        { testTemplateId: test.id, testName: test.name, commissionRate: 0, commissionType: 'FIXED' }
    ]);
    setTestSearch('');
  };

  const updateCustomRate = (index: number, field: string, value: any) => {
    const updated = [...customCommissions];
    updated[index][field] = value;
    setCustomCommissions(updated);
  };

  const removeCustomRate = (index: number) => {
    setCustomCommissions(customCommissions.filter((_, i) => i !== index));
  };

  const filteredAgencies = agencies?.filter((a: any) => 
    a.agencyName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    a.phone?.includes(searchTerm)
  ) || [];

  return (
    <div className="min-h-screen bg-slate-50/50 selection:bg-violet-500/30 relative font-sans text-slate-900 pb-12">
      
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.02] pointer-events-none mix-blend-overlay"></div>
      <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-violet-100/40 to-transparent pointer-events-none"></div>

      <div className="p-4 md:p-8 max-w-[1600px] mx-auto space-y-8 relative z-10">
        
        {/* --- HEADER & CONTROLS (Glassmorphism Card) --- */}
        <div className="bg-white/70 backdrop-blur-xl border border-white/60 shadow-sm rounded-3xl p-6 md:p-8 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 transition-all duration-300">
          <div className="space-y-2">
             <div className="flex items-center gap-3">
                <div className="p-2.5 bg-violet-100 text-violet-700 rounded-xl">
                   <Building2 className="w-6 h-6" />
                </div>
                <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Agency Network</h1>
             </div>
            <p className="text-sm font-medium text-slate-500 ml-12 max-w-xl">
              Manage your B2B partners, collection centers, and hospital tie-ups. Configure default margins and custom test payouts.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row w-full xl:w-auto gap-4 items-center">
            <div className="relative w-full sm:w-80 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-violet-600 transition-colors" />
              <input
                type="text"
                placeholder="Search agencies or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-12 pl-11 pr-4 bg-white/80 border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all shadow-sm"
              />
            </div>
            <Button 
              onClick={handleAddNew} 
              className="w-full sm:w-auto h-12 px-6 rounded-2xl bg-slate-900 hover:bg-violet-600 text-white shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 font-bold"
            >
              <Plus className="h-4 w-4 mr-2" /> Register Agency
            </Button>
          </div>
        </div>

        {/* --- AGENCIES TABLE (Bento List Design) --- */}
        <div className="bg-white/60 backdrop-blur-md rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60 overflow-hidden transition-all duration-500">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/80 border-b border-slate-100/80">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="font-bold text-[11px] uppercase tracking-wider text-slate-500 py-5 pl-6">Agency Details</TableHead>
                  <TableHead className="font-bold text-[11px] uppercase tracking-wider text-slate-500">Contact Person</TableHead>
                  <TableHead className="font-bold text-[11px] uppercase tracking-wider text-slate-500">Margin Rules</TableHead>
                  <TableHead className="font-bold text-[11px] uppercase tracking-wider text-slate-500">Performance</TableHead>
                  <TableHead className="font-bold text-[11px] uppercase tracking-wider text-slate-500 text-right pr-6">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-20 text-slate-500 font-medium">Loading network data...</TableCell></TableRow>
                ) : filteredAgencies.length === 0 ? (
                  <TableRow>
                     <TableCell colSpan={5} className="text-center py-20">
                        <div className="flex flex-col items-center justify-center gap-3 text-slate-400">
                           <Building2 className="h-10 w-10 opacity-20" />
                           <p className="font-medium">No B2B agencies found in your network.</p>
                        </div>
                     </TableCell>
                  </TableRow>
                ) : (
                  filteredAgencies.map((agency: any) => (
                    <TableRow key={agency.id} className="hover:bg-white group transition-colors duration-200 border-b border-slate-50">
                      <TableCell className="py-4 pl-6">
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 bg-gradient-to-br from-violet-100 to-indigo-100 text-violet-700 rounded-2xl flex items-center justify-center font-bold shadow-sm">
                             {agency.agencyName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-extrabold text-slate-800 text-sm">{agency.agencyName}</div>
                            <div className="text-[11px] font-semibold text-slate-400 font-mono mt-1 tracking-wide">
                               PAN: {agency.panNumber || 'UNREGISTERED'}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-bold text-slate-700 flex items-center gap-2">
                           <UserCircle className="h-4 w-4 text-slate-400"/> {agency.contactPerson || 'Not Provided'}
                        </div>
                        <div className="text-xs font-medium text-slate-500 flex items-center gap-2 mt-1.5">
                           <Phone className="h-3.5 w-3.5 text-slate-400"/> {agency.phone || 'N/A'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col items-start gap-2">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold shadow-sm ${agency.commissionType === 'PERCENTAGE' ? 'bg-violet-50 text-violet-700 border border-violet-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'}`}>
                              {agency.commissionType === 'PERCENTAGE' ? <Percent className="h-3.5 w-3.5 mr-1.5 opacity-70"/> : <IndianRupee className="h-3.5 w-3.5 mr-1.5 opacity-70"/>}
                              {agency.commissionRate} {agency.commissionType === 'PERCENTAGE' ? '%' : 'Flat'} 
                              <span className="opacity-60 font-medium ml-1">Default</span>
                            </span>
                            {agency.customTestCommissions?.length > 0 && (
                                <span className="text-[10px] text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 flex items-center gap-1">
                                    <Sparkles className="w-3 h-3"/>
                                    {agency.customTestCommissions.length} Custom Overrides
                                </span>
                            )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-extrabold text-slate-800 flex items-center gap-1.5">
                           <FileSpreadsheet className="w-4 h-4 text-indigo-500" />
                           {agency._count?.tests || 0} Referrals
                        </div>
                        <div className="text-[11px] font-bold text-emerald-600 flex items-center gap-1.5 mt-1.5 uppercase tracking-wide">
                           <Wallet className="w-3.5 h-3.5 opacity-70" />
                           ₹{(agency as any).totalCommission?.toLocaleString() || '0.00'} Generated
                        </div>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <Button variant="outline" size="icon" onClick={() => handleView(agency)} className="h-9 w-9 border-slate-200 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 hover:border-indigo-200 rounded-xl">
                             <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="icon" onClick={() => handleEdit(agency)} className="h-9 w-9 border-slate-200 text-slate-500 hover:text-blue-600 hover:bg-blue-50 hover:border-blue-200 rounded-xl">
                             <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="icon" onClick={() => handleDelete(agency.id)} className="h-9 w-9 border-slate-200 text-slate-500 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200 rounded-xl">
                             <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* --- DETAILED VIEW MODAL (LEDGER) --- */}
        <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
          <DialogContent className="max-w-4xl p-0 overflow-hidden bg-slate-50 border-0 shadow-2xl rounded-3xl">
            <DialogHeader className="bg-white p-8 border-b border-slate-100">
              <div className="flex items-start justify-between">
                 <div className="flex items-center gap-5">
                    <div className="h-16 w-16 bg-gradient-to-br from-violet-500 to-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
                       <Building2 className="h-8 w-8" />
                    </div>
                    <div>
                       <DialogTitle className="text-2xl font-extrabold text-slate-900 tracking-tight">{viewingAgency?.agencyName}</DialogTitle>
                       <DialogDescription className="text-sm font-medium text-slate-500 flex items-center gap-3 mt-1.5">
                          <span className="flex items-center gap-1"><UserCircle className="w-4 h-4"/> {viewingAgency?.contactPerson || 'N/A'}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1"><Phone className="w-4 h-4"/> {viewingAgency?.phone || 'N/A'}</span>
                       </DialogDescription>
                    </div>
                 </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mt-8">
                  <div className="bg-gradient-to-br from-slate-50 to-slate-100 p-5 rounded-2xl border border-slate-200 relative overflow-hidden">
                      <div className="relative z-10">
                          <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest">Total Volume</p>
                          <p className="text-3xl font-black text-slate-800 mt-1">{viewingAgency?._count?.tests || 0}</p>
                      </div>
                      <TrendingUp className="absolute -right-4 -bottom-4 w-24 h-24 text-slate-200/50" />
                  </div>
                  <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 p-5 rounded-2xl border border-emerald-100 relative overflow-hidden">
                      <div className="relative z-10">
                          <p className="text-[11px] text-emerald-600 font-bold uppercase tracking-widest">Lifetime Commissions</p>
                          <p className="text-3xl font-black text-emerald-700 mt-1 tracking-tight">₹{viewingAgency?.totalCommission?.toLocaleString() || '0'}</p>
                      </div>
                      <Wallet className="absolute -right-4 -bottom-4 w-24 h-24 text-emerald-200/40" />
                  </div>
              </div>
            </DialogHeader>

            <div className="p-8">
              <h3 className="text-sm font-extrabold text-slate-800 mb-4 flex items-center gap-2 uppercase tracking-wide">
                 <FileText className="w-4 h-4 text-violet-500"/> Transaction Ledger
              </h3>
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm max-h-[400px] overflow-y-auto">
                  <Table>
                      <TableHeader className="sticky top-0 bg-slate-50/90 backdrop-blur-sm z-10 shadow-sm">
                          <TableRow className="hover:bg-transparent">
                              <TableHead className="text-[10px] font-bold uppercase tracking-wider h-10 pl-6">Date</TableHead>
                              <TableHead className="text-[10px] font-bold uppercase tracking-wider h-10">Patient Details</TableHead>
                              <TableHead className="text-[10px] font-bold uppercase tracking-wider h-10">Test Ordered</TableHead>
                              <TableHead className="text-[10px] font-bold uppercase tracking-wider h-10 text-right">Payout</TableHead>
                              <TableHead className="text-[10px] font-bold uppercase tracking-wider h-10 text-right pr-6">Status</TableHead>
                          </TableRow>
                      </TableHeader>
                      <TableBody>
                          {viewingAgency?.commissions?.length === 0 ? (
                              <TableRow><TableCell colSpan={5} className="text-center py-12 text-sm font-medium text-slate-400">No transactions logged for this agency.</TableCell></TableRow>
                          ) : (
                              viewingAgency?.commissions?.map((comm: any) => (
                                  <TableRow key={comm.id} className="hover:bg-slate-50 transition-colors">
                                      <TableCell className="text-xs text-slate-500 font-mono font-medium pl-6">
                                          {new Date(comm.test.createdAt).toLocaleDateString()}
                                      </TableCell>
                                      <TableCell className="font-bold text-sm text-slate-800">
                                          {comm.test.patient?.name || 'Unknown Patient'}
                                      </TableCell>
                                      <TableCell>
                                          <div className="text-xs font-bold text-slate-700">{comm.test.testName}</div>
                                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">{comm.test.testNumber}</div>
                                      </TableCell>
                                      <TableCell className="text-right font-black text-slate-800">
                                          ₹{comm.amount.toLocaleString()}
                                      </TableCell>
                                      <TableCell className="text-right pr-6">
                                          {comm.status === 'PAID' ? (
                                              <Badge className="bg-emerald-50 text-emerald-700 border-none shadow-sm"><CheckCircle2 className="w-3 h-3 mr-1"/> Paid</Badge>
                                          ) : (
                                              <Badge className="bg-amber-50 text-amber-700 border-none shadow-sm"><Clock className="w-3 h-3 mr-1"/> Pending</Badge>
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

        {/* --- ADD / EDIT MODAL WITH TABS --- */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-3xl p-0 overflow-hidden bg-slate-50 rounded-3xl border-0 shadow-2xl">
            <DialogHeader className="px-8 pt-8 pb-4 bg-white">
              <DialogTitle className="text-2xl font-extrabold tracking-tight text-slate-900">
                 {editingAgency ? 'Update Agency Configuration' : 'Register New Agency'}
              </DialogTitle>
              <DialogDescription className="text-sm font-medium text-slate-500">
                 Setup profile details and define complex commission margins.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="flex flex-col">
              <Tabs defaultValue="basic" className="w-full">
                <div className="px-8 border-b border-slate-200 bg-white">
                    <TabsList className="bg-transparent w-full justify-start p-0 h-auto gap-8 rounded-none">
                      <TabsTrigger 
                         value="basic" 
                         className="rounded-none border-b-2 border-transparent data-[state=active]:border-violet-600 data-[state=active]:bg-transparent py-4 px-1 text-sm font-bold text-slate-500 data-[state=active]:text-violet-700 transition-all"
                      >
                          Profile & Defaults
                      </TabsTrigger>
                      <TabsTrigger 
                         value="custom" 
                         className="rounded-none border-b-2 border-transparent data-[state=active]:border-violet-600 data-[state=active]:bg-transparent py-4 px-1 text-sm font-bold text-slate-500 data-[state=active]:text-violet-700 transition-all flex items-center gap-2"
                      >
                          Custom Test Overrides 
                          <Badge className="bg-violet-100 text-violet-700 border-none text-[10px] h-5 px-1.5 shadow-sm rounded-md font-black">{customCommissions.length}</Badge>
                      </TabsTrigger>
                    </TabsList>
                </div>

                {/* TAB 1: BASIC PROFILE */}
                <TabsContent value="basic" className="p-8 pt-6 space-y-6 m-0">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Agency Name <span className="text-rose-500">*</span></label>
                      <Input placeholder="e.g. City Care Hospital" value={formData.agencyName} onChange={e => setFormData({...formData, agencyName: e.target.value})} className="h-11 rounded-xl bg-white border-slate-200 shadow-sm focus-visible:ring-violet-500" required />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Contact Person</label>
                      <Input placeholder="e.g. Mr. Sharma" value={formData.contactPerson} onChange={e => setFormData({...formData, contactPerson: e.target.value})} className="h-11 rounded-xl bg-white border-slate-200 shadow-sm focus-visible:ring-violet-500" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Phone Number</label>
                      <Input placeholder="9876543210" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="h-11 rounded-xl bg-white border-slate-200 shadow-sm focus-visible:ring-violet-500" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Email Address</label>
                      <Input type="email" placeholder="agency@example.com" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="h-11 rounded-xl bg-white border-slate-200 shadow-sm focus-visible:ring-violet-500" />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">PAN / Tax ID</label>
                      <Input placeholder="ABCDE1234F" className="uppercase font-mono h-11 rounded-xl bg-white border-slate-200 shadow-sm focus-visible:ring-violet-500" value={formData.panNumber} onChange={e => setFormData({...formData, panNumber: e.target.value.toUpperCase()})} />
                      <p className="text-[11px] font-medium text-slate-500 flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5"/> Used for corporate TDS and compliance accounting.</p>
                  </div>

                  <div className="p-6 bg-white border border-slate-200 rounded-2xl space-y-5 shadow-sm">
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                       <Percent className="w-5 h-5 text-violet-500" />
                       <h3 className="text-sm font-extrabold text-slate-800">Base Commission Rule</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Rule Type</label>
                        <Select value={formData.commissionType} onValueChange={(v) => setFormData({...formData, commissionType: v})}>
                          <SelectTrigger className="h-11 rounded-xl bg-slate-50 font-semibold border-slate-200 shadow-sm">
                             <SelectValue/>
                          </SelectTrigger>
                          <SelectContent className="rounded-xl shadow-xl">
                            <SelectItem value="PERCENTAGE" className="font-semibold cursor-pointer">Percentage (%)</SelectItem>
                            <SelectItem value="FIXED" className="font-semibold cursor-pointer">Flat Amount (₹)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Value</label>
                        <Input type="number" step="0.01" min="0" value={formData.commissionRate} onChange={e => setFormData({...formData, commissionRate: Number(e.target.value)})} className="h-11 rounded-xl bg-slate-50 font-black text-slate-900 border-slate-200 shadow-sm focus-visible:ring-violet-500" />
                      </div>
                    </div>
                    <p className="text-[11px] font-medium text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                       Fallback rate. If a test doesn't have a specific custom rate assigned in the next tab, this rule applies.
                    </p>
                  </div>
                </TabsContent>

                {/* TAB 2: CUSTOM TEST RATES */}
                <TabsContent value="custom" className="p-8 pt-6 space-y-6 m-0 min-h-[400px]">
                    <div className="relative z-10">
                       <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                       <Input 
                          placeholder="Search catalog to add custom test override..." 
                          className="h-12 pl-12 rounded-xl bg-white border-slate-200 shadow-sm font-medium focus-visible:ring-violet-500"
                          value={testSearch}
                          onChange={(e) => setTestSearch(e.target.value)}
                       />
                       {testSearch && (
                          <div className="absolute top-14 left-0 w-full bg-white border border-slate-200 rounded-2xl shadow-2xl max-h-64 overflow-y-auto z-50 p-2">
                              {allTests?.filter((t: any) => t.name.toLowerCase().includes(testSearch.toLowerCase())).slice(0, 10).map((t: any) => (
                                  <div 
                                      key={t.id} 
                                      onClick={() => addCustomTestRate(t)}
                                      className="p-3 text-sm rounded-xl hover:bg-violet-50 cursor-pointer flex justify-between items-center transition-colors mb-1 last:mb-0 group"
                                  >
                                      <span className="font-bold text-slate-700 group-hover:text-violet-700">{t.name}</span>
                                      <span className="text-xs bg-slate-100 px-2 py-1 rounded-md text-slate-600 font-mono font-bold group-hover:bg-white">₹{t.price}</span>
                                  </div>
                              ))}
                              {allTests?.filter((t: any) => t.name.toLowerCase().includes(testSearch.toLowerCase())).length === 0 && (
                                  <div className="p-4 text-center text-sm font-medium text-slate-500">No tests found matching "{testSearch}"</div>
                              )}
                          </div>
                       )}
                    </div>

                    <div className="border border-slate-200 rounded-2xl bg-white shadow-sm overflow-hidden">
                        <Table>
                            <TableHeader className="bg-slate-50/80">
                                <TableRow className="hover:bg-transparent">
                                    <TableHead className="text-[10px] font-bold uppercase tracking-wider h-11 pl-6">Test Detail</TableHead>
                                    <TableHead className="text-[10px] font-bold uppercase tracking-wider h-11 w-40">Rule Type</TableHead>
                                    <TableHead className="text-[10px] font-bold uppercase tracking-wider h-11 w-32">Margin</TableHead>
                                    <TableHead className="h-11 w-14"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {customCommissions.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center py-16 bg-slate-50/30">
                                           <div className="flex flex-col items-center justify-center gap-2 text-slate-400">
                                              <Sparkles className="h-8 w-8 opacity-20" />
                                              <p className="text-sm font-medium">No custom overrides defined.</p>
                                              <p className="text-xs">The default profile margin will be used for all tests.</p>
                                           </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    customCommissions.map((cc, index) => (
                                        <TableRow key={index} className="hover:bg-slate-50 transition-colors">
                                            <TableCell className="font-extrabold text-sm text-slate-800 pl-6">{cc.testName}</TableCell>
                                            <TableCell>
                                                <Select value={cc.commissionType} onValueChange={(v) => updateCustomRate(index, 'commissionType', v)}>
                                                    <SelectTrigger className="h-10 text-xs font-bold rounded-lg bg-white border-slate-200 shadow-sm focus:ring-violet-500"><SelectValue/></SelectTrigger>
                                                    <SelectContent className="rounded-xl">
                                                        <SelectItem value="PERCENTAGE" className="font-semibold cursor-pointer">Percentage (%)</SelectItem>
                                                        <SelectItem value="FIXED" className="font-semibold cursor-pointer">Flat (₹)</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </TableCell>
                                            <TableCell>
                                                <Input 
                                                    type="number" 
                                                    step="0.01" 
                                                    className="h-10 text-sm font-black rounded-lg bg-white border-slate-200 shadow-sm focus-visible:ring-violet-500" 
                                                    value={cc.commissionRate} 
                                                    onChange={(e) => updateCustomRate(index, 'commissionRate', Number(e.target.value))}
                                                />
                                            </TableCell>
                                            <TableCell className="pr-4 text-right">
                                                <Button type="button" variant="ghost" size="icon" onClick={() => removeCustomRate(index)} className="h-9 w-9 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl">
                                                    <Trash2 className="h-4 w-4" />
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

              <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200 bg-white">
                <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)} className="h-11 px-6 rounded-xl font-bold text-slate-600 hover:bg-slate-100">Cancel</Button>
                <Button type="submit" className="h-11 px-8 rounded-xl font-bold bg-slate-900 hover:bg-violet-600 text-white shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : <Check className="h-4 w-4 mr-2" />}
                  {editingAgency ? 'Update Agency' : 'Save Agency'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

      </div>
    </div>
  );
}