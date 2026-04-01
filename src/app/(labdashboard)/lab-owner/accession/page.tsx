'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { 
  Search, Plus, Trash2, Save, RotateCcw, 
  FlaskConical, Box, LayoutGrid, Info, CalendarClock, 
  Microscope, UserCheck, Stethoscope, Clock, Syringe,
  CreditCard, FileText, ChevronRight, Activity, Beaker
} from 'lucide-react';
import { toast } from 'react-hot-toast';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

// Enhanced Type Definition to include Parameters
type CatalogItem = {
  id: string;
  name: string;
  code: string;
  type: 'SINGLE' | 'BUNDLE' | 'PROFILE' | 'PARAMETER'; 
  price: number;
  tat?: string;
  sampleType?: { name: string };
  department?: { name: string };
  isParameter?: boolean; 
};

const fetchAccessionData = async (patientId: string) => {
  const [patientRes, catalogRes, parametersRes] = await Promise.all([
    fetch(`/api/lab-owner/patients/${patientId}`).then(r => r.json()),
    fetch(`/api/lab-owner/test-catalog`).then(r => r.json()),
    fetch(`/api/lab-owner/parameters`).then(r => r.ok ? r.json() : []) 
  ]);
  
  const formattedParameters = Array.isArray(parametersRes) ? parametersRes.map((p: any) => ({
      id: p.id,
      name: p.name,
      code: p.code,
      type: 'PARAMETER',
      price: p.price || 0, 
      tat: 'N/A', 
      sampleType: { name: 'N/A' }, 
      isParameter: true
  })) : [];

  const combinedCatalog = [
      ...(Array.isArray(catalogRes) ? catalogRes : []),
      ...formattedParameters
  ];

  return { 
    patient: patientRes,
    catalog: combinedCatalog
  };
};

export default function AccessionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const patientId = searchParams.get('patientId');
  const doctorNameParam = searchParams.get('doc');
  const agencyNameParam = searchParams.get('agency');
  const paymentModeParam = searchParams.get('pay') || 'CASH'; 
  const collectedByParam = searchParams.get('colBy') || ''; 

  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'SINGLE' | 'PROFILE' | 'PARAMETER'>('ALL');
  
  const [selectedTests, setSelectedTests] = useState<CatalogItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [paidAmount, setPaidAmount] = useState(0);
  
  const [paymentMode, setPaymentMode] = useState(paymentModeParam); 
  const [collectedBy, setCollectedBy] = useState(collectedByParam);
  
  // STATE: Collected At (Text based)
  const [collectedAt, setCollectedAt] = useState('');

  // Initialize with readable text format "YYYY-MM-DD HH:mm"
  useEffect(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    setCollectedAt(`${year}-${month}-${day} ${hours}:${minutes}`);
  }, []);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['accession', patientId],
    queryFn: () => {
        if(!patientId) throw new Error("No Patient ID");
        return fetchAccessionData(patientId);
    },
    enabled: !!patientId
  });

  const subTotal = selectedTests.reduce((acc, t) => acc + (t.price || 0), 0);
  const netPayable = Math.max(0, subTotal - discount);
  const balance = Math.max(0, netPayable - paidAmount);

  const filteredCatalog = useMemo(() => {
    if (!data?.catalog) return [];
    return data.catalog.filter((item: CatalogItem) => {
      const matchesSearch = (item.name?.toLowerCase().includes(search.toLowerCase()) || 
                             item.code?.toLowerCase().includes(search.toLowerCase()));
      const matchesType = filterType === 'ALL' || item.type === filterType;
      return matchesSearch && matchesType;
    });
  }, [data?.catalog, search, filterType]);

  const addTest = (test: CatalogItem) => {
    if (selectedTests.find(t => t.id === test.id)) return toast.error("Test/Parameter already added");
    setSelectedTests([...selectedTests, test]);
  };

  const removeTest = (id: string) => {
    setSelectedTests(selectedTests.filter(t => t.id !== id));
  };

  const handleSubmit = async () => {
     if (selectedTests.length === 0) return toast.error("Please select at least one test or parameter");
     
     setIsSubmitting(true);
     try {
        const payload = {
           patientId,
           doctorId: doctorNameParam, 
           agencyName: agencyNameParam,
           paymentMode: paymentMode,
           
           collectedBy: collectedBy,
           collectedAt: collectedAt ? new Date(collectedAt) : new Date(),

           tests: selectedTests.map(t => ({ id: t.id, price: t.price, type: t.type })), 
           financials: { subTotal, discount, netPayable, paidAmount, balance }
        };

        const res = await fetch('/api/lab-owner/orders', {
           method: 'POST',
           body: JSON.stringify(payload)
        });

        if (!res.ok) throw new Error("Failed to create order");
        
        const json = await res.json();
        toast.success("Order Registered!");
        router.push(`/lab-owner/billing/${json.invoiceId}`);
     } catch (error) {
        toast.error("Registration failed");
     } finally {
        setIsSubmitting(false);
     }
  };

  if (isLoading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
        <div className="relative">
            <div className="w-12 h-12 rounded-full border-4 border-indigo-200 animate-spin border-t-indigo-600"></div>
            <Microscope className="absolute inset-0 m-auto h-5 w-5 text-indigo-600 animate-pulse" />
        </div>
        <p className="text-slate-500 font-medium animate-pulse">Initializing Accession Workspace...</p>
    </div>
  );
  
  if (!data) return <div className="min-h-screen flex items-center justify-center text-slate-500">Error loading patient data.</div>;

  return (
    <div className="flex flex-col h-screen bg-slate-50/80 font-sans relative overflow-hidden selection:bg-indigo-500/30">
      
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.02] pointer-events-none mix-blend-overlay"></div>
      <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-indigo-50/50 to-transparent pointer-events-none"></div>

      {/* --- HEADER (Glassmorphism) --- */}
      <header className="flex-none h-auto sm:h-20 bg-white/70 backdrop-blur-xl border-b border-slate-200/60 px-4 sm:px-8 flex flex-col sm:flex-row justify-between sm:items-center gap-4 py-4 sm:py-0 shadow-sm z-20">
         <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
            <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-inner text-white font-bold text-xl">
                    {data.patient.name.charAt(0)}
                </div>
                <div>
                    <h1 className="font-extrabold text-xl sm:text-2xl text-slate-900 tracking-tight leading-none">
                        {data.patient.name}
                    </h1>
                    <div className="flex items-center gap-2 mt-1.5 text-xs sm:text-sm font-medium text-slate-500">
                        <Badge variant="secondary" className="bg-slate-100 hover:bg-slate-200 text-slate-600 border-none px-2 py-0.5 rounded-md">
                            {data.patient.age} {data.patient.ageUnit || 'Y'} / {data.patient.gender}
                        </Badge>
                        <span className="text-slate-300">•</span>
                        <span className="flex items-center gap-1 font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                            ID: {data.patient.patientId}
                        </span>
                    </div>
                </div>
            </div>

            {doctorNameParam && doctorNameParam !== 'Self' && (
                <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-indigo-50 border border-indigo-100 rounded-xl">
                    <Stethoscope className="w-4 h-4 text-indigo-600" />
                    <span className="text-sm font-semibold text-indigo-900">Ref: {doctorNameParam}</span>
                </div>
            )}
         </div>

         <div className="flex items-center gap-3">
             <div className="text-right hidden md:block">
                <div className="text-sm font-bold text-slate-700">{new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</div>
                <div className="text-xs font-medium text-slate-400">{new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</div>
             </div>
             <Button variant="outline" size="icon" className="h-10 w-10 rounded-full border-slate-200 text-slate-500 hover:text-slate-900 shadow-sm" onClick={() => router.back()}>
                 <RotateCcw className="h-4 w-4" />
             </Button>
         </div>
      </header>

      {/* --- MAIN WORKSPACE --- */}
      <div className="flex-1 overflow-y-auto lg:overflow-hidden p-4 sm:p-6">
          <div className="max-w-[1800px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
             
             {/* LEFT: TEST CATALOG (4 Cols) */}
             <Card className="lg:col-span-4 flex flex-col border-0 shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white/60 backdrop-blur-md rounded-3xl overflow-hidden h-[60vh] lg:h-full">
                <div className="p-5 border-b border-slate-100 bg-white/40 space-y-4 flex-none z-10">
                   <div className="relative group">
                      <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                      <Input 
                        placeholder="Search for tests, packages, or parameters..." 
                        className="pl-10 h-11 bg-white border-slate-200 rounded-xl shadow-sm focus-visible:ring-indigo-500 text-sm font-medium transition-all" 
                        autoFocus
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                   </div>
                   <Tabs defaultValue="ALL" className="w-full" onValueChange={(v) => setFilterType(v as any)}>
                      <TabsList className="w-full h-10 grid grid-cols-4 bg-slate-100/80 p-1 rounded-xl"> 
                         <TabsTrigger value="ALL" className="rounded-lg text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-indigo-700 data-[state=active]:shadow-sm transition-all">All</TabsTrigger>
                         <TabsTrigger value="SINGLE" className="rounded-lg text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-indigo-700 data-[state=active]:shadow-sm transition-all">Tests</TabsTrigger>
                         <TabsTrigger value="PROFILE" className="rounded-lg text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-indigo-700 data-[state=active]:shadow-sm transition-all">Pkgs</TabsTrigger>
                         <TabsTrigger value="PARAMETER" className="rounded-lg text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-indigo-700 data-[state=active]:shadow-sm transition-all">Params</TabsTrigger> 
                      </TabsList>
                   </Tabs>
                </div>

                <div className="flex-1 overflow-y-auto p-2 bg-slate-50/30">
                   <div className="space-y-1.5">
                      {filteredCatalog.map((item) => (
                         <div 
                            key={item.id} 
                            onClick={() => addTest(item)}
                            className="p-4 bg-white border border-slate-100 rounded-2xl cursor-pointer group transition-all duration-300 hover:shadow-md hover:border-indigo-200 hover:-translate-y-0.5 flex justify-between items-center"
                         >
                            <div className="space-y-1.5 pr-4">
                               <div className="font-bold text-sm text-slate-800 group-hover:text-indigo-700 leading-tight transition-colors">
                                  {item.name}
                               </div>
                               <div className="flex flex-wrap items-center gap-2">
                                  <Badge variant="outline" className="text-[10px] uppercase tracking-wider h-5 px-1.5 text-slate-500 font-semibold border-slate-200 bg-slate-50">
                                     {item.code}
                                  </Badge>
                                  {item.type === 'PROFILE' && <Badge className="text-[10px] h-5 px-1.5 bg-violet-100 text-violet-700 hover:bg-violet-100 border-0 shadow-none"><Box className="w-3 h-3 mr-1"/> Pkg</Badge>}
                                  {item.type === 'PARAMETER' && <Badge className="text-[10px] h-5 px-1.5 bg-amber-100 text-amber-700 hover:bg-amber-100 border-0 shadow-none"><LayoutGrid className="w-3 h-3 mr-1"/> Param</Badge>}
                                  {item.type === 'SINGLE' && <Badge className="text-[10px] h-5 px-1.5 bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0 shadow-none"><FlaskConical className="w-3 h-3 mr-1"/> Test</Badge>}
                               </div>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                               <div className="font-extrabold text-sm text-slate-700">₹{item.price}</div>
                               <div className="h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                  <Plus className="h-4 w-4" />
                               </div>
                            </div>
                         </div>
                      ))}
                      {filteredCatalog.length === 0 && (
                          <div className="flex flex-col items-center justify-center h-48 text-slate-400">
                              <Search className="h-8 w-8 mb-2 opacity-20" />
                              <p className="text-sm font-medium">No tests found</p>
                          </div>
                      )}
                   </div>
                </div>
             </Card>

             {/* MIDDLE: SELECTED TESTS (5 Cols) */}
             <Card className="lg:col-span-5 flex flex-col border-0 shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white/60 backdrop-blur-md rounded-3xl overflow-hidden h-[60vh] lg:h-full">
                <div className="p-5 border-b border-slate-100 bg-white/40 flex justify-between items-center flex-none">
                   <div>
                       <CardTitle className="text-lg font-extrabold text-slate-800 flex items-center gap-2">
                           <Activity className="h-5 w-5 text-indigo-500" />
                           Selected Items
                       </CardTitle>
                       <CardDescription className="text-xs font-medium mt-1 text-slate-500">
                           {selectedTests.length} {selectedTests.length === 1 ? 'item' : 'items'} in current order
                       </CardDescription>
                   </div>
                   {selectedTests.length > 0 && (
                       <Button variant="ghost" size="sm" className="h-8 text-xs font-semibold text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg" onClick={() => setSelectedTests([])}>
                          Clear Cart
                       </Button>
                   )}
                </div>

                <div className="flex-1 overflow-auto bg-white/30">
                   <Table>
                      <TableHeader className="bg-slate-50/80 sticky top-0 z-10 backdrop-blur-sm">
                         <TableRow className="h-10 hover:bg-transparent border-slate-100">
                            <TableHead className="w-[45%] text-xs font-bold uppercase tracking-wider text-slate-500 pl-6">Test Detail</TableHead>
                            <TableHead className="w-[20%] text-xs font-bold uppercase tracking-wider text-slate-500 hidden sm:table-cell">Sample</TableHead>
                            <TableHead className="w-[20%] text-xs font-bold uppercase tracking-wider text-slate-500 text-right">Rate</TableHead>
                            <TableHead className="w-[15%] pr-6"></TableHead>
                         </TableRow>
                      </TableHeader>
                      <TableBody>
                         {selectedTests.length === 0 ? (
                            <TableRow className="hover:bg-transparent">
                               <TableCell colSpan={4} className="h-[40vh] text-center border-0">
                                  <div className="flex flex-col items-center justify-center gap-3">
                                     <div className="h-16 w-16 rounded-2xl bg-indigo-50 flex items-center justify-center">
                                         <Beaker className="h-8 w-8 text-indigo-300" />
                                     </div>
                                     <div className="space-y-1">
                                         <h3 className="text-sm font-bold text-slate-700">No Tests Selected</h3>
                                         <p className="text-xs text-slate-500 max-w-[200px] mx-auto">Search and select tests from the catalog to add them to this order.</p>
                                     </div>
                                  </div>
                               </TableCell>
                            </TableRow>
                         ) : (
                            selectedTests.map((t, idx) => (
                               <TableRow key={`${t.id}-${idx}`} className="h-14 hover:bg-white/80 transition-colors border-b border-slate-50">
                                  <TableCell className="pl-6">
                                     <div className="font-bold text-sm text-slate-800 leading-tight">{t.name}</div>
                                     <div className="flex items-center gap-2 mt-1">
                                        <span className="text-[10px] text-slate-400 font-medium">{t.code}</span>
                                        {t.type === 'PROFILE' && <span className="text-[9px] uppercase tracking-wider font-bold text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded-sm">Pkg</span>}
                                     </div>
                                  </TableCell>
                                  <TableCell className="hidden sm:table-cell">
                                      <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                                          <Syringe className="h-3 w-3 text-slate-400" />
                                          {t.sampleType?.name || 'N/A'}
                                      </div>
                                  </TableCell>
                                  <TableCell className="text-right font-extrabold text-sm text-slate-700">₹{t.price}</TableCell>
                                  <TableCell className="text-right pr-6">
                                     <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" onClick={() => removeTest(t.id)}>
                                        <Trash2 className="h-4 w-4" />
                                     </Button>
                                  </TableCell>
                               </TableRow>
                            ))
                         )}
                      </TableBody>
                   </Table>
                </div>
             </Card>

             {/* RIGHT: BILLING & CHECKOUT (3 Cols) */}
             <Card className="lg:col-span-3 flex flex-col border-0 shadow-[0_8px_30px_rgb(0,0,0,0.06)] bg-white rounded-3xl overflow-hidden h-auto lg:h-full relative z-20">
                <div className="p-5 border-b border-slate-100 flex-none bg-slate-50/50">
                   <h3 className="font-extrabold text-slate-800 flex items-center gap-2">
                       <CreditCard className="w-5 h-5 text-indigo-500" />
                       Checkout & Billing
                   </h3>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-6">
                   
                   {/* Financial Summary Box */}
                   <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-4">
                       <div className="flex justify-between items-center text-sm font-semibold text-slate-600">
                           <span>Subtotal</span>
                           <span className="text-slate-900 font-bold">₹ {subTotal}</span>
                       </div>
                       
                       <div className="flex items-center justify-between gap-4">
                          <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider shrink-0">Discount (₹)</Label>
                          <Input 
                            type="number" 
                            value={discount} 
                            onChange={e => setDiscount(Number(e.target.value))} 
                            className="h-10 w-24 text-right font-bold text-rose-600 border-slate-200 bg-white shadow-sm focus-visible:ring-indigo-500 rounded-xl" 
                          />
                       </div>
                       
                       <div className="pt-4 border-t border-slate-200/60">
                           <div className="bg-gradient-to-r from-violet-600 to-indigo-600 rounded-xl p-4 flex justify-between items-center shadow-lg shadow-indigo-500/20 text-white">
                               <span className="text-xs font-bold uppercase tracking-wider opacity-90">Net Payable</span>
                               <span className="font-extrabold text-2xl tracking-tight">₹ {netPayable}</span>
                           </div>
                       </div>
                   </div>
                   
                   {/* Payment Controls */}
                   <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                         <div className="space-y-1.5">
                            <Label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Amount Paid</Label>
                            <Input 
                                type="number" 
                                value={paidAmount} 
                                onChange={e => setPaidAmount(Number(e.target.value))} 
                                className="h-11 font-bold border-slate-200 shadow-sm focus-visible:ring-emerald-500 rounded-xl" 
                            />
                         </div>
                         <div className="space-y-1.5">
                            <Label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Pay Mode</Label>
                            <Select value={paymentMode} onValueChange={setPaymentMode}>
                               <SelectTrigger className="h-11 font-semibold border-slate-200 shadow-sm rounded-xl">
                                   <SelectValue />
                               </SelectTrigger>
                               <SelectContent className="rounded-xl shadow-xl border-slate-100">
                                  <SelectItem value="CASH" className="font-medium cursor-pointer rounded-lg">Cash</SelectItem>
                                  <SelectItem value="UPI" className="font-medium cursor-pointer rounded-lg">UPI / QR</SelectItem>
                                  <SelectItem value="CARD" className="font-medium cursor-pointer rounded-lg">Card</SelectItem>
                                  <SelectItem value="DUE" className="font-medium cursor-pointer rounded-lg text-rose-600">Credit / Due</SelectItem>
                               </SelectContent>
                            </Select>
                         </div>
                      </div>

                      <div className="flex justify-between items-center p-3 rounded-xl bg-slate-50 border border-slate-100">
                         <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Balance Due</span>
                         <span className={`font-extrabold text-lg ${balance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>₹ {balance}</span>
                      </div>
                   </div>

                   {/* Collection Details Section */}
                   <div className="space-y-4 pt-2">
                       <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">Sample Details</h4>
                       <div className="space-y-3">
                           <div className="space-y-1.5">
                              <Label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Collected By</Label>
                              <div className="relative">
                                 <UserCheck className="absolute left-3 top-3.5 h-4 w-4 text-slate-400"/>
                                 <Input 
                                    value={collectedBy} 
                                    onChange={(e) => setCollectedBy(e.target.value)}
                                    className="h-11 pl-9 text-sm font-medium border-slate-200 shadow-sm rounded-xl focus-visible:ring-indigo-500"
                                    placeholder="Phlebotomist Name"
                                 />
                              </div>
                           </div>
                           <div className="space-y-1.5">
                              <Label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Collection Time</Label>
                              <div className="relative">
                                 <CalendarClock className="absolute left-3 top-3.5 h-4 w-4 text-slate-400 pointer-events-none"/>
                                 <Input 
                                    type="text" 
                                    value={collectedAt}
                                    onChange={(e) => setCollectedAt(e.target.value)}
                                    className="h-11 pl-9 text-sm font-medium border-slate-200 shadow-sm rounded-xl focus-visible:ring-indigo-500 font-mono"
                                    placeholder="YYYY-MM-DD HH:mm"
                                 />
                              </div>
                           </div>
                       </div>
                   </div>

                   {/* Add-ons */}
                   <div className="space-y-4 pt-2">
                      <div className="space-y-3">
                         <Label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Print Configuration</Label>
                         <div className="flex gap-6">
                            <div className="flex items-center space-x-2.5">
                               <Checkbox id="slip" defaultChecked className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-600" />
                               <label htmlFor="slip" className="text-sm font-medium text-slate-700 cursor-pointer">Print Slip</label>
                            </div>
                            <div className="flex items-center space-x-2.5">
                               <Checkbox id="barcode" defaultChecked className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-600" />
                               <label htmlFor="barcode" className="text-sm font-medium text-slate-700 cursor-pointer">Barcodes</label>
                            </div>
                         </div>
                      </div>

                      <div className="space-y-1.5">
                         <Label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Order Notes</Label>
                         <Textarea placeholder="Special instructions for lab technician..." className="h-20 text-sm resize-none rounded-xl border-slate-200 shadow-sm focus-visible:ring-indigo-500 p-3" />
                      </div>
                   </div>
                </div>

                {/* Submit Footer */}
                <div className="p-4 border-t border-slate-100 bg-white flex flex-col sm:flex-row gap-3 flex-none z-30 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.05)]">
                   <Button 
                      className="flex-1 h-12 text-sm font-bold bg-slate-900 hover:bg-indigo-600 text-white shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 rounded-xl"
                      onClick={handleSubmit}
                      disabled={isSubmitting || selectedTests.length === 0}
                   >
                      {isSubmitting ? (
                          <div className="flex items-center gap-2">
                              <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"></div>
                              Processing...
                          </div>
                      ) : (
                          <div className="flex items-center gap-2">
                              Submit & Generate Bill
                              <ChevronRight className="w-4 h-4" />
                          </div>
                      )}
                   </Button>
                </div>
             </Card>

          </div>
      </div>
    </div>
  );
}