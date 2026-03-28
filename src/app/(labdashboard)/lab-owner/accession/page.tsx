'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { 
  Search, Plus, Trash2, Save, RotateCcw, 
  FlaskConical, Box, LayoutGrid, Info, CalendarClock, Microscope, UserCheck
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
import { Card } from "@/components/ui/card";
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
  
  // ✅ STATE: Collected At (Text based)
  const [collectedAt, setCollectedAt] = useState('');

  // ✅ Initialize with readable text format "YYYY-MM-DD HH:mm"
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
           // ✅ SEND AS DATE OBJECT (Parses text string)
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

  if (isLoading) return <div className="h-screen flex items-center justify-center">Loading Accession...</div>;
  if (!data) return <div>Error loading data</div>;

  return (
    <div className="flex flex-col h-[calc(100vh-60px)] bg-slate-100 overflow-hidden">
      
      {/* HEADER */}
      <div className="flex-none h-14 bg-white border-b px-4 flex justify-between items-center shadow-sm z-10">
         <div className="flex items-center gap-4 text-sm">
            <span className="font-bold text-lg text-blue-900">{data.patient.name}</span>
            <span className="text-slate-500 border-l pl-3">{data.patient.age} {data.patient.ageUnit || 'Y'} / {data.patient.gender}</span>
            <span className="text-slate-500 border-l pl-3">ID: <span className="font-mono text-slate-700">{data.patient.patientId}</span></span>
            
            {doctorNameParam && doctorNameParam !== 'Self' && (
                <span className="text-slate-500 border-l pl-3 font-medium text-blue-600">Ref: {doctorNameParam}</span>
            )}
         </div>
         <div className="text-xs font-medium text-slate-500">
            {new Date().toLocaleDateString()} | {new Date().toLocaleTimeString()}
         </div>
      </div>

      <div className="flex-1 grid grid-cols-12 gap-0 overflow-hidden min-h-0">
         
         {/* LEFT: CATALOG */}
         <div className="col-span-3 bg-white border-r flex flex-col h-full overflow-hidden">
            <div className="p-3 border-b space-y-3 bg-slate-50/50 flex-none">
               <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                  <Input 
                    placeholder="Search test..." 
                    className="pl-9 h-9 bg-white" 
                    autoFocus
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
               </div>
               <Tabs defaultValue="ALL" className="w-full" onValueChange={(v) => setFilterType(v as any)}>
                  <TabsList className="w-full h-8 grid grid-cols-4 p-0.5 bg-slate-200/60"> 
                     <TabsTrigger value="ALL" className="text-[10px]">All</TabsTrigger>
                     <TabsTrigger value="SINGLE" className="text-[10px]">Tests</TabsTrigger>
                     <TabsTrigger value="PROFILE" className="text-[10px]">Pkg</TabsTrigger>
                     <TabsTrigger value="PARAMETER" className="text-[10px]">Param</TabsTrigger> 
                  </TabsList>
               </Tabs>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0">
               <div className="divide-y">
                  {filteredCatalog.map((item) => (
                     <div 
                        key={item.id} 
                        onClick={() => addTest(item)}
                        className="p-3 hover:bg-blue-50 cursor-pointer group transition-colors flex justify-between items-start"
                     >
                        <div className="space-y-1">
                           <div className="font-medium text-sm text-slate-800 group-hover:text-blue-700">
                              {item.name}
                           </div>
                           <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-[10px] h-4 px-1 text-slate-500 font-normal border-slate-300">
                                 {item.code}
                              </Badge>
                              {item.type === 'PROFILE' && <Badge className="text-[10px] h-4 px-1 bg-purple-100 text-purple-700 border-0">Pkg</Badge>}
                              {item.type === 'PARAMETER' && <Badge className="text-[10px] h-4 px-1 bg-yellow-100 text-yellow-700 border-0">Param</Badge>}
                           </div>
                        </div>
                        <div className="font-semibold text-sm text-slate-600">₹{item.price}</div>
                     </div>
                  ))}
               </div>
            </div>
         </div>

         {/* CENTER: SELECTED TESTS */}
         <div className="col-span-6 bg-slate-50/30 flex flex-col h-full border-r overflow-hidden">
            <div className="p-2 border-b bg-white flex justify-between items-center flex-none h-12">
               <h2 className="font-semibold text-sm text-slate-800 px-2">Selected Tests ({selectedTests.length})</h2>
               <Button variant="ghost" size="sm" className="h-7 text-xs text-red-600" onClick={() => setSelectedTests([])}>
                  Clear All
               </Button>
            </div>

            <div className="flex-1 overflow-auto min-h-0">
               <Table>
                  <TableHeader className="bg-slate-100 sticky top-0 z-10">
                     <TableRow className="h-9 hover:bg-slate-100">
                        <TableHead className="w-[45%] text-xs font-semibold text-slate-600 pl-4">Test Name</TableHead>
                        <TableHead className="w-[15%] text-xs font-semibold text-slate-600">Sample</TableHead>
                        <TableHead className="w-[15%] text-xs font-semibold text-slate-600">TAT</TableHead>
                        <TableHead className="w-[15%] text-xs font-semibold text-slate-600 text-right">Rate</TableHead>
                        <TableHead className="w-[10%]"></TableHead>
                     </TableRow>
                  </TableHeader>
                  <TableBody>
                     {selectedTests.length === 0 ? (
                        <TableRow>
                           <TableCell colSpan={5} className="h-64 text-center text-slate-400">
                              <div className="flex flex-col items-center gap-2">
                                 <Microscope className="h-8 w-8 opacity-20" />
                                 <span>No tests selected</span>
                              </div>
                           </TableCell>
                        </TableRow>
                     ) : (
                        selectedTests.map((t, idx) => (
                           <TableRow key={`${t.id}-${idx}`} className="h-10 hover:bg-white border-b border-slate-100">
                              <TableCell className="pl-4 font-medium text-sm text-slate-700">
                                 {t.name}
                                 {t.type === 'PROFILE' && <span className="ml-2 text-[10px] text-purple-600 bg-purple-50 px-1 rounded">Pkg</span>}
                              </TableCell>
                              <TableCell className="text-xs text-slate-500">
                                 {t.sampleType?.name || '-'}
                              </TableCell>
                              <TableCell className="text-xs text-slate-500">
                                 {t.tat || '-'}
                              </TableCell>
                              <TableCell className="text-right font-medium text-slate-700">₹{t.price}</TableCell>
                              <TableCell className="text-right pr-2">
                                 <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-red-600" onClick={() => removeTest(t.id)}>
                                    <Trash2 className="h-3.5 w-3.5" />
                                 </Button>
                              </TableCell>
                           </TableRow>
                        ))
                     )}
                  </TableBody>
               </Table>
            </div>
         </div>

         {/* RIGHT: BILLING & ACTION */}
         <div className="col-span-3 bg-white flex flex-col h-full shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.05)] z-20 overflow-hidden relative">
            
            <div className="p-3 border-b bg-blue-50/30 flex-none h-12 flex items-center">
               <h3 className="font-bold text-slate-800 text-sm">Payment Details</h3>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 p-4 space-y-4">
               {/* Totals */}
               <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                     <Label className="text-[10px] uppercase font-bold text-slate-500">Total</Label>
                     <Input readOnly value={subTotal} className="h-8 bg-slate-50 font-bold" />
                  </div>
                  <div className="space-y-1">
                     <Label className="text-[10px] uppercase font-bold text-slate-500">Discount</Label>
                     <Input type="number" value={discount} onChange={e => setDiscount(Number(e.target.value))} className="h-8 text-red-600" />
                  </div>
               </div>

               <div className="bg-blue-600 text-white rounded-md p-2 flex justify-between items-center shadow-sm">
                  <span className="text-xs font-medium opacity-80">Net Payable</span>
                  <span className="font-bold text-lg">₹ {netPayable}</span>
               </div>
               
               <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                     <Label className="text-[10px] uppercase font-bold text-slate-500">Paid</Label>
                     <Input type="number" value={paidAmount} onChange={e => setPaidAmount(Number(e.target.value))} className="h-8 border-green-200" />
                  </div>
                  <div className="space-y-1">
                     <Label className="text-[10px] uppercase font-bold text-slate-500">Mode</Label>
                     <Select value={paymentMode} onValueChange={setPaymentMode}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                           <SelectItem value="CASH">Cash</SelectItem>
                           <SelectItem value="UPI">UPI / QR</SelectItem>
                           <SelectItem value="CARD">Card</SelectItem>
                           <SelectItem value="DUE">Credit</SelectItem>
                        </SelectContent>
                     </Select>
                  </div>
               </div>

               {/* ✅ UPDATED SAMPLE DETAILS (GRID LAYOUT + TEXT INPUT FOR TIME) */}
               <div className="grid grid-cols-2 gap-3 pt-2">
                   <div className="space-y-1">
                      <Label className="text-[10px] uppercase font-bold text-slate-500">Collected By</Label>
                      <div className="relative">
                         <UserCheck className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400"/>
                         <Input 
                            value={collectedBy} 
                            onChange={(e) => setCollectedBy(e.target.value)}
                            className="h-9 pl-8 text-xs border-slate-200 bg-slate-50 focus:bg-white"
                            placeholder="Name..."
                         />
                      </div>
                   </div>
                   <div className="space-y-1">
                      <Label className="text-[10px] uppercase font-bold text-slate-500">Collected At</Label>
                      <div className="relative">
                         <CalendarClock className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400 pointer-events-none"/>
                         <Input 
                            type="text" // ✅ CHANGED TO TEXT INPUT
                            value={collectedAt}
                            onChange={(e) => setCollectedAt(e.target.value)}
                            className="h-9 pl-8 text-xs border-slate-200 bg-slate-50 focus:bg-white"
                            placeholder="YYYY-MM-DD HH:mm"
                         />
                      </div>
                   </div>
               </div>

               <div className="flex justify-between items-center text-xs font-bold border-t pt-2 mt-2">
                  <span className="text-slate-500">Balance Due:</span>
                  <span className={balance > 0 ? 'text-red-600' : 'text-green-600'}>₹ {balance}</span>
               </div>

               <div className="space-y-2 pt-2">
                  <Label className="text-[10px] uppercase font-bold text-slate-500">Print Options</Label>
                  <div className="flex gap-4">
                     <div className="flex items-center space-x-2">
                        <Checkbox id="slip" defaultChecked />
                        <label htmlFor="slip" className="text-xs text-slate-700">Slip</label>
                     </div>
                     <div className="flex items-center space-x-2">
                        <Checkbox id="barcode" defaultChecked />
                        <label htmlFor="barcode" className="text-xs text-slate-700">Barcode</label>
                     </div>
                  </div>
               </div>

               <div className="space-y-1 pt-1 pb-2">
                  <Label className="text-[10px] uppercase font-bold text-slate-500">Note</Label>
                  <Textarea placeholder="Instructions..." className="h-14 text-xs resize-none" />
               </div>
            </div>

            <div className="p-3 border-t bg-slate-50 flex gap-2 flex-none z-30 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
               <Button variant="outline" className="flex-1 h-9 text-xs border-slate-300" onClick={() => router.back()}>
                  Cancel
               </Button>
               <Button 
                  className="flex-[2] h-9 text-xs bg-blue-700 hover:bg-blue-800 shadow-sm"
                  onClick={handleSubmit}
                  disabled={isSubmitting || selectedTests.length === 0}
               >
                  {isSubmitting ? '...' : 'Submit Order'}
               </Button>
            </div>
         </div>

      </div>
    </div>
  );
}