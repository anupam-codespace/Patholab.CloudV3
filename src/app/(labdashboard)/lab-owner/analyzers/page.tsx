'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCommissionDashboardData, markCommissionAsPaid } from '@/actions/commission-management';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Search, Stethoscope, Building2, CheckCircle2, 
  Receipt, FileText, TrendingUp, Users, Wallet, 
  Loader2, ChevronRight, IndianRupee 
} from 'lucide-react';
import toast from 'react-hot-toast';

// Dynamic Color Palette for N categories
const CATEGORY_COLORS = ['#e11d48', '#44403c', '#0d9488', '#d97706', '#6366f1', '#ec4899', '#8b5cf6'];

// Smart Icon Assigner based on category string
const getCategoryIcon = (catName: string, className = "w-4 h-4") => {
  const lower = catName.toLowerCase();
  if (lower.includes('doc')) return <Stethoscope className={className} />;
  if (lower.includes('agenc') || lower.includes('hosp') || lower.includes('clinic')) return <Building2 className={className} />;
  return <Users className={className} />;
};

export default function CommissionsPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState(''); // Will auto-initialize based on dynamic data
  
  // Settlement Modal State
  const [isSettleModalOpen, setIsSettleModalOpen] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<any>(null);
  const [transactionRef, setTransactionRef] = useState('');

  // Fetch Data
  // Expects data like: { doctors: [...], agencies: [...], brokers: [...] }
  const { data, isLoading } = useQuery({
    queryKey: ['commissions'],
    queryFn: async () => await getCommissionDashboardData()
  });

  // Settle Mutation
  const settleMutation = useMutation({
    mutationFn: async (payload: { ids: string[], ref: string }) => {
      await markCommissionAsPaid(payload.ids, payload.ref);
    },
    onSuccess: () => {
      toast.success("Commissions marked as PAID successfully!");
      setIsSettleModalOpen(false);
      setTransactionRef('');
      queryClient.invalidateQueries({ queryKey: ['commissions'] });
    },
    onError: () => toast.error("Failed to settle commissions.")
  });

  const handleOpenSettle = (entity: any) => {
    setSelectedEntity(entity);
    setIsSettleModalOpen(true);
  };

  const handleSettleSubmit = () => {
    if (!selectedEntity) return;
    const pendingIds = selectedEntity.recentCommissions
      .filter((c: any) => c.status === 'PENDING')
      .map((c: any) => c.id);

    if (pendingIds.length === 0) return toast.error("No pending commissions to settle.");
    settleMutation.mutate({ ids: pendingIds, ref: transactionRef || 'Cash Settlement' });
  };

  // ==========================================
  // DYNAMIC STATISTICS ENGINE
  // ==========================================
  const stats = useMemo(() => {
    if (!data) return null;

    // 1. Dynamically extract all categories from the API response
    const categories = Object.keys(data).filter(key => Array.isArray(data[key]));
    
    let allPartners: any[] = [];
    let globalPending = 0;
    let globalPaid = 0;
    
    const categoryStats: Record<string, { pending: number, paid: number, generated: number, percent: number, color: string }> = {};

    // 2. Process each category dynamically
    categories.forEach((cat, index) => {
        const items = data[cat] || [];
        
        const catPending = items.reduce((sum: number, item: any) => sum + (item.totalPending || 0), 0);
        const catPaid = items.reduce((sum: number, item: any) => sum + (item.totalPaid || 0), 0);
        const catGenerated = catPending + catPaid;

        globalPending += catPending;
        globalPaid += catPaid;

        categoryStats[cat] = {
            pending: catPending,
            paid: catPaid,
            generated: catGenerated,
            percent: 0, // Calculated below
            color: CATEGORY_COLORS[index % CATEGORY_COLORS.length]
        };

        // Flatten array for global calculations
        const enhancedItems = items.map((p: any) => ({ 
            ...p, 
            _category: cat, 
            _color: categoryStats[cat].color,
            totalGenerated: (p.totalPaid || 0) + (p.totalPending || 0) 
        }));
        allPartners = [...allPartners, ...enhancedItems];
    });

    const globalGenerated = globalPending + globalPaid;

    // 3. Calculate perfect percentages for the dynamic donut chart
    if (globalGenerated > 0) {
        categories.forEach(cat => {
            categoryStats[cat].percent = Math.round((categoryStats[cat].generated / globalGenerated) * 100);
        });
    }

    const activePartnersCount = allPartners.filter(p => p.totalGenerated > 0).length;

    // Top 5 Global Referrers across all dynamic categories
    const topPerformers = [...allPartners]
        .filter(p => p.totalGenerated > 0)
        .sort((a, b) => b.totalGenerated - a.totalGenerated)
        .slice(0, 5);
        
    const maxPerformerValue = topPerformers[0]?.totalGenerated || 1;

    // Generate dynamic CSS Conic Gradient string
    let currentStop = 0;
    const conicGradientString = categories.map((cat, i) => {
        const { percent, color } = categoryStats[cat];
        const start = currentStop;
        const end = i === categories.length - 1 ? 100 : currentStop + percent; // Ensure last segment closes the gap
        currentStop = end;
        return `${color} ${start}% ${end}%`;
    }).join(', ');

    return {
        categories,
        categoryStats,
        globalPending, 
        globalPaid, 
        globalGenerated, 
        activePartnersCount,
        topPerformers, 
        maxPerformerValue,
        conicGradientString
    };
  }, [data]);

  // Safely determine which tab to show (fallback to the first dynamic category if activeTab is unset)
  const currentTab = activeTab || (stats?.categories?.[0] ?? '');
  const displayList = data ? (data[currentTab] || []) : [];
  
  const filteredList = displayList.filter((item: any) => 
    item.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-stone-50 relative font-sans text-stone-900 pb-12 selection:bg-rose-500/30">
      
      {/* Subtle Noise Background */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.02] pointer-events-none mix-blend-overlay"></div>
      <div className="absolute top-0 left-0 w-full h-[400px] bg-gradient-to-b from-rose-100/40 via-stone-100/20 to-transparent pointer-events-none"></div>

      <div className="max-w-[1600px] mx-auto p-4 md:p-8 relative z-10 space-y-8 animate-in fade-in duration-500 slide-in-from-bottom-4">
        
        {/* --- HEADER --- */}
        <div className="bg-white/60 backdrop-blur-xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-3xl p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
               <div className="p-3 bg-gradient-to-br from-rose-500 to-rose-600 text-white rounded-xl shadow-md shadow-rose-500/20">
                  <IndianRupee className="w-6 h-6" /> {/* ✅ FIXED ICON */}
               </div>
               <h1 className="text-3xl md:text-4xl font-extrabold text-stone-900 tracking-tight">
                 Partner Commissions
               </h1>
            </div>
            <p className="text-sm font-medium text-stone-500 ml-12">
              Track multi-channel payouts, analyze top referring partners, and seamlessly settle accounts.
            </p>
          </div>
        </div>

        {/* --- 1. FOUR KPI CARDS (Bento Box grid) --- */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="group relative bg-white/80 backdrop-blur-md border border-stone-200/60 rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-rose-200">
            <div className="absolute -right-6 -top-6 w-24 h-24 bg-rose-500/10 rounded-full blur-2xl group-hover:bg-rose-500/20 transition-colors"></div>
            <div className="flex justify-between items-start mb-6 relative z-10">
               <p className="text-[11px] font-extrabold text-stone-400 uppercase tracking-widest">Total Generated</p>
               <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl"><TrendingUp className="w-5 h-5" /></div>
            </div>
            <h2 className="text-3xl font-black text-stone-900 tracking-tight relative z-10">
                 ₹{stats?.globalGenerated.toLocaleString() || '0'}
            </h2>
          </div>

          <div className="group relative bg-white/80 backdrop-blur-md border border-stone-200/60 rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-emerald-200">
            <div className="absolute -right-6 -top-6 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-colors"></div>
            <div className="flex justify-between items-start mb-6 relative z-10">
               <p className="text-[11px] font-extrabold text-stone-400 uppercase tracking-widest">Settled (Paid)</p>
               <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl"><CheckCircle2 className="w-5 h-5" /></div>
            </div>
            <h2 className="text-3xl font-black text-emerald-600 tracking-tight relative z-10">
                 ₹{stats?.globalPaid.toLocaleString() || '0'}
            </h2>
          </div>

          <div className="group relative bg-stone-900 border border-stone-800 rounded-3xl p-6 shadow-xl overflow-hidden transition-all duration-300 hover:shadow-rose-500/10 hover:-translate-y-0.5">
            <div className="absolute -right-6 -top-6 w-24 h-24 bg-amber-500/20 rounded-full blur-2xl group-hover:bg-amber-500/30 transition-colors"></div>
            <div className="flex justify-between items-start mb-6 relative z-10">
               <p className="text-[11px] font-extrabold text-stone-400 uppercase tracking-widest">Unpaid (Pending)</p>
               <div className="p-2.5 bg-stone-800 text-amber-400 rounded-xl"><Receipt className="w-5 h-5" /></div>
            </div>
            <h2 className="text-3xl font-black text-white tracking-tight relative z-10">
                 ₹{stats?.globalPending.toLocaleString() || '0'}
            </h2>
          </div>

          <div className="group relative bg-white/80 backdrop-blur-md border border-stone-200/60 rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-stone-300">
            <div className="absolute -right-6 -top-6 w-24 h-24 bg-stone-500/10 rounded-full blur-2xl group-hover:bg-stone-500/20 transition-colors"></div>
            <div className="flex justify-between items-start mb-6 relative z-10">
               <p className="text-[11px] font-extrabold text-stone-400 uppercase tracking-widest">Active Partners</p>
               <div className="p-2.5 bg-stone-100 text-stone-600 rounded-xl"><Users className="w-5 h-5" /></div>
            </div>
            <h2 className="text-3xl font-black text-stone-900 tracking-tight relative z-10">
                 {stats?.activePartnersCount || '0'}
            </h2>
          </div>

        </div>

        {/* --- 2. DYNAMIC CHARTS & INSIGHTS --- */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Top Performers Bar Chart (Spans 8 cols) */}
          <div className="lg:col-span-8 bg-white/80 backdrop-blur-xl rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60 p-6 md:p-8 flex flex-col">
              <h3 className="text-lg font-extrabold text-stone-800 mb-8 flex items-center gap-2">
                 <TrendingUp className="w-5 h-5 text-rose-500"/> Global Top 5 Performers
              </h3>
              
              {!stats || stats.topPerformers.length === 0 ? (
                 <div className="flex-1 flex flex-col items-center justify-center text-stone-400 gap-3 py-10">
                    <TrendingUp className="w-10 h-10 opacity-20" />
                    <p className="text-sm font-bold uppercase tracking-widest">No commissions generated yet</p>
                 </div>
              ) : (
                 <div className="space-y-6 flex-1 flex flex-col justify-center">
                    {stats.topPerformers.map((partner, idx) => {
                        const totalPercent = (partner.totalGenerated / stats.maxPerformerValue) * 100;
                        const paidPercent = (partner.totalPaid / partner.totalGenerated) * 100;
                        const pendingPercent = (partner.totalPending / partner.totalGenerated) * 100;

                        return (
                        <div key={idx} className="space-y-2.5 group">
                            <div className="flex justify-between text-sm font-bold text-stone-800">
                                <span className="flex items-center gap-2">
                                    <div className="p-1.5 rounded-md shadow-sm" style={{ backgroundColor: partner._color + '20', color: partner._color }}>
                                        {getCategoryIcon(partner._category, "w-3.5 h-3.5")}
                                    </div>
                                    {partner.name} <span className="text-[10px] text-stone-400 font-medium uppercase tracking-widest ml-1">({partner._category})</span>
                                </span>
                                <span className="font-black text-base">₹{partner.totalGenerated.toLocaleString()}</span>
                            </div>
                            
                            {/* Smooth Bar Chart */}
                            <div className="h-4 w-full bg-stone-100 rounded-full overflow-hidden flex items-center shadow-inner">
                                <div className="h-full flex transition-all duration-1000 ease-out" style={{ width: `${totalPercent}%` }}>
                                    {/* Paid (Emerald) and Pending (Amber) */}
                                    <div style={{ width: `${paidPercent}%` }} className="bg-emerald-500 h-full border-r-2 border-white/30 hover:opacity-90 transition-opacity" title={`Paid: ₹${partner.totalPaid}`}></div>
                                    <div style={{ width: `${pendingPercent}%` }} className="bg-amber-400 h-full hover:opacity-90 transition-opacity" title={`Pending: ₹${partner.totalPending}`}></div>
                                </div>
                            </div>
                        </div>
                    )})}
                    
                    <div className="flex items-center gap-6 text-[10px] font-extrabold uppercase tracking-widest text-stone-400 mt-6 pt-6 border-t border-stone-100">
                        <span className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm"></div> Settled / Paid</span>
                        <span className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-sm"></div> Unpaid / Pending</span>
                    </div>
                 </div>
              )}
          </div>

          {/* Dynamic Revenue Distribution Donut Chart (Spans 4 cols) */}
          <div className="lg:col-span-4 bg-white/80 backdrop-blur-xl rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60 p-6 md:p-8 flex flex-col">
              <h3 className="text-lg font-extrabold text-stone-800 mb-8 flex items-center gap-2">
                 <Wallet className="w-5 h-5 text-rose-500"/> Revenue Split
              </h3>
              
              {!stats || stats.globalGenerated === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-stone-400 gap-3 py-10">
                    <Wallet className="w-10 h-10 opacity-20" />
                    <p className="text-sm font-bold uppercase tracking-widest">No data available</p>
                  </div>
              ) : (
                  <div className="flex-1 flex flex-col items-center justify-start">
                      
                      {/* Dynamically Generated CSS Donut Chart */}
                      <div 
                        className="relative w-40 h-40 rounded-full mb-8 shadow-lg shadow-stone-200/50 flex-shrink-0" 
                        style={{ background: `conic-gradient(${stats.conicGradientString})`}}
                      >
                          <div className="absolute inset-[14px] bg-white rounded-full flex items-center justify-center flex-col shadow-inner">
                             <span className="text-[10px] text-stone-400 font-extrabold uppercase tracking-widest">Total</span>
                             <span className="text-xl font-black text-stone-900 tracking-tight">₹{(stats.globalGenerated / 1000).toFixed(1)}k</span>
                          </div>
                      </div>

                      <div className="w-full space-y-3 bg-stone-50 p-5 rounded-2xl border border-stone-100 flex-1 overflow-y-auto scrollbar-thin">
                          {stats.categories.map((cat) => {
                              const catData = stats.categoryStats[cat];
                              return (
                                  <div key={cat} className="flex items-center justify-between text-sm">
                                      <div className="flex items-center gap-2.5 font-bold text-stone-700 capitalize">
                                          <div className="w-3 h-3 rounded shadow-sm" style={{ backgroundColor: catData.color }}></div> 
                                          {cat} <span className="text-stone-400 text-xs font-mono">({catData.percent}%)</span>
                                      </div>
                                      <span className="font-black text-stone-900">₹{catData.generated.toLocaleString()}</span>
                                  </div>
                              )
                          })}
                      </div>
                  </div>
              )}
          </div>
        </div>

        {/* --- 3. DYNAMIC TABS & DATA TABLE --- */}
        <div className="bg-white/80 backdrop-blur-xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-3xl overflow-hidden flex flex-col">
          <Tabs value={currentTab} onValueChange={setActiveTab} className="w-full">
              
              {/* Dynamic Tab Controls & Search */}
              <div className="p-6 border-b border-stone-100 flex flex-col md:flex-row justify-between items-center gap-6 bg-stone-50/50">
                  <TabsList className="bg-stone-200/50 p-1.5 rounded-2xl h-14 w-full md:w-auto flex flex-wrap">
                      {stats?.categories?.map((cat) => (
                          <TabsTrigger 
                              key={cat} 
                              value={cat} 
                              className="flex items-center justify-center gap-2 rounded-xl text-sm font-bold data-[state=active]:bg-white data-[state=active]:text-rose-600 data-[state=active]:shadow-sm px-6 h-full transition-all flex-1 md:flex-auto capitalize"
                          >
                             {getCategoryIcon(cat)} {cat}
                          </TabsTrigger>
                      ))}
                  </TabsList>
                  
                  <div className="relative w-full md:w-96 group">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-stone-400 group-focus-within:text-rose-500 transition-colors" />
                      <Input
                          type="text"
                          placeholder={`Search ${currentTab}...`}
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full h-12 pl-12 pr-4 bg-white border-stone-200 rounded-xl text-sm font-medium focus-visible:ring-rose-500 shadow-sm"
                      />
                  </div>
              </div>

              {/* Data Table */}
              <div className="overflow-x-auto bg-white/30 min-h-[400px]">
                <Table>
                  <TableHeader className="bg-stone-50/80 border-b border-stone-100/80">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="font-extrabold text-[10px] uppercase tracking-widest text-stone-500 py-5 pl-6">Partner Profile</TableHead>
                      <TableHead className="font-extrabold text-[10px] uppercase tracking-widest text-stone-500">Commission Rule</TableHead>
                      <TableHead className="font-extrabold text-[10px] uppercase tracking-widest text-stone-500 text-right">Pending Payout</TableHead>
                      <TableHead className="font-extrabold text-[10px] uppercase tracking-widest text-stone-500 text-right">Lifetime Paid</TableHead>
                      <TableHead className="font-extrabold text-[10px] uppercase tracking-widest text-stone-500 text-right pr-6">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                         <TableCell colSpan={5} className="h-64 text-center">
                            <div className="flex flex-col items-center justify-center gap-3">
                               <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
                               <span className="text-xs font-bold text-stone-400 uppercase tracking-widest">Loading Records...</span>
                            </div>
                         </TableCell>
                      </TableRow>
                    ) : filteredList.length === 0 ? (
                      <TableRow>
                         <TableCell colSpan={5} className="h-64 text-center">
                            <div className="flex flex-col items-center justify-center gap-3 text-stone-400">
                               <FileText className="w-10 h-10 opacity-20" />
                               <span className="text-xs font-bold uppercase tracking-widest">No matching records found in {currentTab}.</span>
                            </div>
                         </TableCell>
                      </TableRow>
                    ) : (
                      filteredList.map((item: any) => {
                        const totalGen = item.totalPending + item.totalPaid;
                        const progress = totalGen > 0 ? (item.totalPaid / totalGen) * 100 : 0;
                        
                        return (
                        <TableRow key={item.id} className="hover:bg-stone-50/50 group transition-colors border-b border-stone-50">
                          <TableCell className="py-4 pl-6">
                            <div className="font-extrabold text-sm text-stone-900 leading-tight">{item.name}</div>
                            <div className="text-[11px] font-medium text-stone-500 mt-1 flex items-center gap-1.5">
                               <div className="w-1.5 h-1.5 rounded-full bg-stone-300"></div>
                               {item.contact || 'No contact info'}
                            </div>
                          </TableCell>
                          
                          <TableCell>
                            <Badge variant="outline" className="bg-white text-stone-600 border-stone-200 font-bold uppercase tracking-wider text-[10px] px-2.5 py-1 shadow-sm">
                               {item.commissionRule}
                            </Badge>
                          </TableCell>
                          
                          <TableCell className="text-right">
                            <div className="font-black text-rose-600 text-base tracking-tight mb-1">₹{item.totalPending.toLocaleString()}</div>
                            {item.pendingCount > 0 && (
                               <div className="text-[10px] font-bold text-rose-400/80 uppercase tracking-widest">{item.pendingCount} UNPAID TESTS</div>
                            )}
                          </TableCell>
                          
                          <TableCell className="text-right">
                            <div className="font-bold text-stone-700 text-sm mb-2">₹{item.totalPaid.toLocaleString()}</div>
                            {totalGen > 0 && (
                              <div className="w-24 h-1.5 bg-stone-100 rounded-full ml-auto overflow-hidden shadow-inner border border-stone-200/50" title={`${Math.round(progress)}% Paid`}>
                                  <div className="h-full bg-emerald-500" style={{width: `${progress}%`}}></div>
                              </div>
                            )}
                          </TableCell>
                          
                          <TableCell className="text-right pr-6">
                            <Button 
                              size="sm" 
                              className={`h-10 px-5 rounded-xl font-bold shadow-sm transition-all ${item.totalPending > 0 ? "bg-stone-900 hover:bg-rose-600 text-white hover:shadow-lg hover:-translate-y-0.5" : "bg-stone-100 text-stone-400 hover:bg-stone-100 cursor-not-allowed"}`}
                              disabled={item.totalPending === 0}
                              onClick={() => handleOpenSettle(item)}
                            >
                              {item.totalPending > 0 ? (
                                  <>Settle Payout <ChevronRight className="w-4 h-4 ml-1 -mr-1" /></>
                              ) : (
                                  <><CheckCircle2 className="w-4 h-4 mr-1.5 opacity-50" /> All Settled</>
                              )}
                            </Button>
                          </TableCell>
                        </TableRow>
                      )})
                    )}
                  </TableBody>
                </Table>
              </div>
          </Tabs>
        </div>

        {/* --- SETTLEMENT MODAL --- */}
        <Dialog open={isSettleModalOpen} onOpenChange={setIsSettleModalOpen}>
          <DialogContent className="max-w-2xl p-0 overflow-hidden bg-stone-50 border-0 shadow-2xl rounded-3xl">
            <DialogHeader className="px-8 pt-8 pb-6 bg-white border-b border-stone-100">
              <DialogTitle className="text-2xl font-extrabold tracking-tight text-stone-900">
                 Account Settlement
              </DialogTitle>
              <DialogDescription className="text-sm font-medium text-stone-500 mt-1">
                  Review the pending ledger for <span className="font-bold text-rose-600">{selectedEntity?.name}</span> before processing the final payout.
              </DialogDescription>
            </DialogHeader>
            
            <div className="p-8 space-y-6">
                
                {/* Checkout Summary Card */}
                <div className="bg-stone-900 border border-stone-800 p-6 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 shadow-xl relative overflow-hidden">
                    <div className="absolute -right-10 -top-10 w-40 h-40 bg-rose-500/20 rounded-full blur-3xl pointer-events-none"></div>
                    <div className="relative z-10">
                        <p className="text-[10px] font-extrabold text-stone-400 uppercase tracking-widest mb-1">Total Payout Amount</p>
                        <p className="text-4xl font-black text-white tracking-tighter">₹{selectedEntity?.totalPending?.toLocaleString() || '0'}</p>
                    </div>
                    <div className="w-full sm:w-64 relative z-10">
                        <label className="text-[10px] font-extrabold text-stone-400 uppercase tracking-widest mb-1.5 block">Payment Ref / Note</label>
                        <Input 
                            placeholder="e.g. UPI Txn ID or Cheque No." 
                            value={transactionRef} 
                            onChange={(e) => setTransactionRef(e.target.value)}
                            className="h-11 bg-white/10 border-white/20 text-white placeholder:text-stone-500 focus-visible:ring-rose-500 focus-visible:border-rose-500 rounded-xl"
                        />
                    </div>
                </div>

                {/* Ledger Table */}
                <div className="space-y-3">
                    <h4 className="font-extrabold text-xs text-stone-800 uppercase tracking-widest flex items-center gap-2">
                       <FileText className="w-4 h-4 text-rose-500"/> Pending Ledger Breakdown
                    </h4>
                    <div className="border border-stone-200 rounded-2xl max-h-[250px] overflow-y-auto bg-white shadow-sm scrollbar-thin scrollbar-thumb-stone-200">
                        <Table>
                            <TableHeader className="sticky top-0 bg-stone-50/90 backdrop-blur-sm z-10 shadow-sm border-b border-stone-100">
                                <TableRow className="hover:bg-transparent">
                                    <TableHead className="text-[10px] font-extrabold uppercase tracking-widest h-10 pl-6 text-stone-500">Date</TableHead>
                                    <TableHead className="text-[10px] font-extrabold uppercase tracking-widest h-10 text-stone-500">Patient & Test</TableHead>
                                    <TableHead className="text-[10px] font-extrabold uppercase tracking-widest h-10 text-right pr-6 text-stone-500">Commission</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {selectedEntity?.recentCommissions?.filter((c:any) => c.status === 'PENDING').map((comm: any) => (
                                    <TableRow key={comm.id} className="hover:bg-stone-50 transition-colors border-b border-stone-50">
                                        <TableCell className="text-xs font-medium text-stone-500 font-mono pl-6">
                                           {new Date(comm.test.createdAt).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-sm font-bold text-stone-900">{comm.test?.patient?.name}</div>
                                            <div className="text-[10px] font-bold uppercase tracking-widest text-rose-600 mt-0.5">{comm.test?.testName} <span className="text-stone-400 font-mono">({comm.test?.testNumber})</span></div>
                                        </TableCell>
                                        <TableCell className="text-right font-black text-base text-stone-800 pr-6 tracking-tight">
                                           ₹{comm.amount}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            </div>

            <DialogFooter className="p-6 bg-white border-t border-stone-100 flex items-center justify-end gap-3">
              <Button variant="ghost" onClick={() => setIsSettleModalOpen(false)} className="h-12 px-6 rounded-xl font-bold text-stone-500 hover:bg-stone-100 hover:text-stone-900">Cancel</Button>
              <Button 
                  onClick={handleSettleSubmit} 
                  disabled={settleMutation.isPending || selectedEntity?.totalPending === 0}
                  className="h-12 px-8 rounded-xl font-black bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20 hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-2"
              >
                  {settleMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin"/> : <CheckCircle2 className="w-5 h-5"/>}
                  {settleMutation.isPending ? 'Processing...' : 'Confirm & Mark Paid'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </div>
  );
}
