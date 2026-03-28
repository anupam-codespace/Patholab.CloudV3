'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Search, UserPlus, Phone, CreditCard, FileText, 
  History, User, ArrowRight, Loader2, Fingerprint, ScanBarcode 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import toast from 'react-hot-toast';

export default function RegistrationSearchPage() {
  const router = useRouter();
  
  const [query, setQuery] = useState('');
  const [searchType, setSearchType] = useState('PHONE');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  // --- SEARCH HANDLER ---
  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setHasSearched(true);
    try {
      const res = await fetch(`/api/lab-owner/patients/search?query=${query}&type=${searchType}`);
      const data = await res.json();
      setResults(data);
    } catch (error) {
      toast.error("Search failed");
    } finally {
      setLoading(false);
    }
  };

  // --- ACTIONS ---
  const proceedToAccession = (patientId: string) => {
    router.push(`/lab-owner/accession?patientId=${patientId}&doc=Self&agency=Direct`);
  };

  const createNewPatient = () => {
    // Navigate to a dedicated creation form, or pass the phone number to accession to auto-open a modal
    // For now, let's assume we go to a create page
    router.push(`/lab-owner/patients/new?phone=${query}`); 
  };

  return (
    <div className="min-h-[calc(100vh-theme(spacing.16))] bg-slate-50 flex flex-col items-center py-12 px-4">
      
      {/* 1. HERO SEARCH SECTION */}
      <div className="w-full max-w-2xl text-center space-y-6 mb-12">
        <div className="space-y-2">
           <h1 className="text-3xl font-bold tracking-tight text-slate-900">Patient Registration</h1>
           <p className="text-slate-500">Search existing records before creating a new visit.</p>
        </div>

        <Card className="shadow-lg border-0 overflow-hidden">
           <div className="p-2 bg-white flex gap-2">
              <Select value={searchType} onValueChange={setSearchType}>
                 <SelectTrigger className="w-[140px] border-0 focus:ring-0 bg-slate-50 font-medium">
                    <SelectValue />
                 </SelectTrigger>
                 <SelectContent>
                    <SelectItem value="PHONE"><div className="flex items-center gap-2"><Phone className="h-4 w-4"/> Phone</div></SelectItem>
                    <SelectItem value="NAME"><div className="flex items-center gap-2"><User className="h-4 w-4"/> Name</div></SelectItem>
                    <SelectItem value="ABHA"><div className="flex items-center gap-2"><Fingerprint className="h-4 w-4"/> ABHA ID</div></SelectItem>
                    <SelectItem value="AADHAAR"><div className="flex items-center gap-2"><ScanBarcode className="h-4 w-4"/> Aadhaar</div></SelectItem>
                 </SelectContent>
              </Select>

              <form onSubmit={handleSearch} className="flex-1 flex gap-2">
                 <Input 
                    placeholder={searchType === 'PHONE' ? "Enter 10-digit mobile number..." : "Enter search query..."} 
                    className="border-0 focus-visible:ring-0 text-lg px-2 shadow-none"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    autoFocus
                 />
                 <Button type="submit" size="lg" className="bg-blue-600 hover:bg-blue-700 px-8" disabled={loading}>
                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
                 </Button>
              </form>
           </div>
        </Card>
      </div>

      {/* 2. RESULTS SECTION */}
      <div className="w-full max-w-5xl space-y-6">
        
        {/* CASE A: NO RESULTS FOUND (SHOW CREATE OPTION) */}
        {hasSearched && results.length === 0 && !loading && (
           <div className="text-center space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 max-w-md mx-auto">
                 <div className="h-16 w-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <UserPlus className="h-8 w-8 text-blue-600" />
                 </div>
                 <h3 className="text-lg font-bold text-slate-800">No Patient Found</h3>
                 <p className="text-sm text-slate-500 mb-6">
                    No record found for <span className="font-mono font-bold text-slate-700">{query}</span>. 
                    Would you like to register them?
                 </p>
                 <Button onClick={createNewPatient} size="lg" className="w-full bg-blue-600 hover:bg-blue-700 shadow-md">
                    Create New Patient
                 </Button>
              </div>
           </div>
        )}

        {/* CASE B: RESULTS FOUND */}
        {results.map((patient) => (
           <Card key={patient.id} className="overflow-hidden border-l-4 border-l-blue-600 shadow-md hover:shadow-lg transition-shadow">
              <div className="grid grid-cols-12">
                 
                 {/* PATIENT INFO (Left) */}
                 <div className="col-span-12 md:col-span-4 bg-slate-50/50 p-6 flex flex-col justify-between border-r">
                    <div className="flex items-start gap-4">
                       <Avatar className="h-14 w-14 border-2 border-white shadow-sm">
                          <AvatarFallback className="bg-blue-100 text-blue-700 font-bold text-xl">
                             {patient.name.charAt(0)}
                          </AvatarFallback>
                       </Avatar>
                       <div>
                          <h3 className="text-lg font-bold text-slate-900">{patient.name}</h3>
                          <p className="text-sm text-slate-500 font-medium">
                             {patient.age} {patient.ageUnit} / {patient.gender}
                          </p>
                          <Badge variant="outline" className="mt-2 bg-white text-slate-600 font-mono text-xs">
                             PID: {patient.patientId}
                          </Badge>
                       </div>
                    </div>
                    
                    <div className="mt-6 space-y-2 text-sm text-slate-600">
                       <div className="flex items-center gap-2">
                          <Phone className="h-3.5 w-3.5 text-slate-400" /> {patient.phone}
                       </div>
                       {/* Placeholders for Future IDs */}
                       <div className="flex items-center gap-2 opacity-50">
                          <Fingerprint className="h-3.5 w-3.5" /> ABHA: Not Linked
                       </div>
                    </div>

                    <div className="mt-6 pt-4 border-t">
                       <Button onClick={() => proceedToAccession(patient.id)} className="w-full bg-blue-600 hover:bg-blue-700">
                          Start New Visit <ArrowRight className="ml-2 h-4 w-4" />
                       </Button>
                    </div>
                 </div>

                 {/* HISTORY TABS (Right) */}
                 <div className="col-span-12 md:col-span-8 p-6">
                    <Tabs defaultValue="tests" className="w-full">
                       <div className="flex justify-between items-center mb-4">
                          <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                             <History className="h-4 w-4" /> Recent History
                          </h4>
                          <TabsList className="h-8">
                             <TabsTrigger value="tests" className="text-xs">Tests</TabsTrigger>
                             <TabsTrigger value="billing" className="text-xs">Billing</TabsTrigger>
                          </TabsList>
                       </div>

                       <TabsContent value="tests" className="mt-0">
                          {patient.tests.length === 0 ? (
                             <div className="text-center py-8 text-slate-400 text-sm bg-slate-50 rounded-lg border border-dashed">No test history found.</div>
                          ) : (
                             <div className="space-y-2">
                                {patient.tests.map((t: any) => (
                                   <div key={t.id} className="flex justify-between items-center p-3 bg-white border rounded hover:bg-slate-50 transition-colors">
                                      <div className="flex items-center gap-3">
                                         <div className="h-2 w-2 rounded-full bg-blue-500" />
                                         <span className="font-medium text-sm text-slate-700">{t.testName}</span>
                                      </div>
                                      <Badge variant="secondary" className="text-[10px]">{t.status}</Badge>
                                   </div>
                                ))}
                             </div>
                          )}
                       </TabsContent>

                       <TabsContent value="billing" className="mt-0">
                          {patient.invoices.length === 0 ? (
                             <div className="text-center py-8 text-slate-400 text-sm bg-slate-50 rounded-lg border border-dashed">No billing history found.</div>
                          ) : (
                             <div className="space-y-2">
                                {patient.invoices.map((inv: any) => (
                                   <div key={inv.id} className="flex justify-between items-center p-3 bg-white border rounded hover:bg-slate-50 transition-colors">
                                      <div>
                                         <p className="font-bold text-sm text-slate-800">#{inv.invoiceNumber}</p>
                                         <p className="text-[10px] text-slate-400">{new Date(inv.createdAt).toLocaleDateString()}</p>
                                      </div>
                                      <div className="text-right">
                                         <p className="font-bold text-sm">₹{inv.grandTotal}</p>
                                         <span className={`text-[10px] font-bold ${inv.status === 'PAID' ? 'text-green-600' : 'text-orange-600'}`}>
                                            {inv.status}
                                         </span>
                                      </div>
                                   </div>
                                ))}
                             </div>
                          )}
                       </TabsContent>
                    </Tabs>
                 </div>

              </div>
           </Card>
        ))}

      </div>
    </div>
  );
}