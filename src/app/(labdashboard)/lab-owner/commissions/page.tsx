'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCommissionDashboardData, markCommissionAsPaid } from '@/actions/commission-management';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { 
  Search, 
  Stethoscope, 
  Building2, 
  CheckCircle2, 
  Receipt, 
  FileText, 
  TrendingUp, 
  Users, 
  Wallet, 
  IndianRupee,
  ChevronRight, 
  LayoutDashboard, 
  History,
  Banknote, 
  AlertCircle,
  Activity,
  Clock
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function CommissionsPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('doctors');
  
  // Settlement Modal State
  const [isSettleModalOpen, setIsSettleModalOpen] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<any>(null);
  const [transactionRef, setTransactionRef] = useState('');

  /** 🔒 RULE 1: PRESERVE ALL LOGIC */
  const { data, isLoading } = useQuery({
    queryKey: ['commissions'],
    queryFn: async () => await getCommissionDashboardData()
  });

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

  const displayList = activeTab === 'doctors' ? data?.doctors : data?.agencies;
  const filteredList = displayList?.filter((item: any) => 
    item.name?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const stats = useMemo(() => {
    const docs = data?.doctors || [];
    const ags = data?.agencies || [];
    const allPartners = [...docs, ...ags].map(p => ({
        ...p,
        totalGenerated: p.totalPaid + p.totalPending
    }));

    const totalDocPending = docs.reduce((acc, d) => acc + d.totalPending, 0);
    const totalDocPaid = docs.reduce((acc, d) => acc + d.totalPaid, 0);
    const totalAgPending = ags.reduce((acc, a) => acc + a.totalPending, 0);
    const totalAgPaid = ags.reduce((acc, a) => acc + a.totalPaid, 0);

    const globalPending = totalDocPending + totalAgPending;
    const globalPaid = totalDocPaid + totalAgPaid;
    const globalGenerated = globalPending + globalPaid;
    const activePartnersCount = allPartners.filter(p => p.totalGenerated > 0).length;

    const topPerformers = [...allPartners]
        .filter(p => p.totalGenerated > 0)
        .sort((a, b) => b.totalGenerated - a.totalGenerated)
        .slice(0, 5);
        
    const maxPerformerValue = topPerformers[0]?.totalGenerated || 1;
    const docGenerated = totalDocPending + totalDocPaid;
    const agGenerated = totalAgPending + totalAgPaid;
    const docPercent = globalGenerated > 0 ? Math.round((docGenerated / globalGenerated) * 100) : 0;
    const agPercent = globalGenerated > 0 ? Math.round((agGenerated / globalGenerated) * 100) : 0;

    return {
        globalPending, globalPaid, globalGenerated, activePartnersCount,
        topPerformers, maxPerformerValue,
        docGenerated, agGenerated, docPercent, agPercent
    };
  }, [data]);

  /** 🎨 RULE 2: REIMAGINED UI */
  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-slate-950 p-4 md:p-8 lg:p-12 font-sans selection:bg-indigo-100">
      
      {/* HEADER SECTION */}
      <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:border-indigo-800">
            <LayoutDashboard className="w-4 h-4" />
            <span className="text-xs font-bold tracking-widest uppercase">Financial Hub</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 dark:text-white">
            Payout <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">Commissions</span>
          </h1>
          <p className="text-slate-500 font-medium italic">patholab.cloud — Real-time Referral Ledger & Settlements</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Global Status</p>
            <div className="flex items-center gap-2 text-emerald-500 font-mono text-xs">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              Ledger Synchronized
            </div>
          </div>
        </div>
      </header>

      {/* KPI GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Revenue Generated', val: stats.globalGenerated, icon: TrendingUp, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Settled Payouts', val: stats.globalPaid, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
          { label: 'Awaiting Settlement', val: stats.globalPending, icon: Receipt, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
          { label: 'Active Partners', val: stats.activePartnersCount, icon: Users, color: 'text-purple-600', bg: 'bg-purple-50', suffix: '' }
        ].map((kpi, i) => (
          <div key={i} className={`bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border ${kpi.border || 'border-slate-100'} transition-all hover:shadow-md relative overflow-hidden group`}>
            <div className={`absolute -right-4 -top-4 ${kpi.bg} dark:bg-slate-800 w-24 h-24 rounded-full opacity-40 group-hover:scale-110 transition-transform`} />
            <div className="relative z-10 flex flex-col h-full justify-between">
              <div className={`h-10 w-10 ${kpi.bg} dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-4`}>
                <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{kpi.label}</p>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white tabular-nums tracking-tighter">
                  {kpi.suffix === '' ? kpi.val : `₹${kpi.val.toLocaleString()}`}
                </h2>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ANALYTICS SPLIT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8">
        {/* Top Performers Chart */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-900 rounded-[32px] shadow-sm border border-slate-100 dark:border-slate-800 p-8">
          <div className="flex items-center justify-between mb-8">
            <div className="space-y-1">
              <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-indigo-500"/> Performance Leaders
              </h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Top 5 Revenue Contributors</p>
            </div>
          </div>
          
          {stats.topPerformers.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-slate-400 gap-3 italic">
              <History className="w-8 h-8 opacity-20" />
              <p className="text-sm font-medium">No contribution data yet.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {stats.topPerformers.map((partner, idx) => {
                const totalPercent = (partner.totalGenerated / stats.maxPerformerValue) * 100;
                const paidPercent = (partner.totalPaid / partner.totalGenerated) * 100;
                const pendingPercent = (partner.totalPending / partner.totalGenerated) * 100;

                return (
                  <div key={idx} className="group">
                    <div className="flex justify-between items-end mb-2">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 bg-slate-50 dark:bg-slate-800 rounded-lg flex items-center justify-center font-black text-xs text-slate-400">
                          {idx + 1}
                        </div>
                        <div>
                          <span className="text-sm font-black text-slate-800 dark:text-white group-hover:text-indigo-600 transition-colors tracking-tight flex items-center gap-2">
                            {partner.type === 'DOCTOR' ? <Stethoscope className="w-3.5 h-3.5 text-indigo-400"/> : <Building2 className="w-3.5 h-3.5 text-teal-400"/>}
                            {partner.name}
                          </span>
                        </div>
                      </div>
                      <span className="text-sm font-black text-slate-900 dark:text-slate-200 tabular-nums">₹{partner.totalGenerated.toLocaleString()}</span>
                    </div>
                    <div className="h-4 w-full bg-slate-50 dark:bg-slate-800 rounded-full overflow-hidden flex items-center p-1 shadow-inner">
                      <div className="h-full flex gap-1 transition-all duration-1000" style={{ width: `${totalPercent}%` }}>
                        <div style={{ width: `${paidPercent}%` }} className="bg-gradient-to-r from-emerald-500 to-emerald-400 h-full rounded-full" title={`Paid: ₹${partner.totalPaid}`}></div>
                        <div style={{ width: `${pendingPercent}%` }} className="bg-gradient-to-r from-amber-500 to-amber-400 h-full rounded-full" title={`Pending: ₹${partner.totalPending}`}></div>
                      </div>
                    </div>
                  </div>
                )
              })}
              <div className="flex items-center gap-6 text-[10px] font-black uppercase tracking-widest pt-6 border-t border-slate-50 dark:border-slate-800">
                <span className="flex items-center gap-2 text-emerald-500">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-200"></div> Paid Funds
                </span>
                <span className="flex items-center gap-2 text-amber-500">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-sm shadow-amber-200"></div> Pending Funds
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Revenue Distribution */}
        <div className="lg:col-span-4 bg-slate-900 rounded-[32px] shadow-2xl p-8 flex flex-col text-white">
          <h3 className="text-sm font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2 mb-8">
            <Wallet className="w-4 h-4"/> Revenue Share
          </h3>
          
          {stats.globalGenerated === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center opacity-30 gap-3 italic">
              <Banknote className="w-10 h-10" />
              <p className="text-xs">No distribution data</p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col">
              <div className="flex-1 flex items-center justify-center relative">
                <div className="relative w-48 h-48 rounded-full shadow-[0_0_50px_rgba(99,102,241,0.15)]" style={{ background: `conic-gradient(#6366f1 0% ${stats.docPercent}%, #14b8a6 ${stats.docPercent}% 100%)`}}>
                  <div className="absolute inset-8 bg-slate-900 rounded-full flex items-center justify-center flex-col">
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Portfolio</p>
                    <p className="text-2xl font-black text-white tabular-nums">₹{(stats.globalGenerated / 1000).toFixed(1)}k</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-8">
                <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]"></div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Doctors</p>
                      <p className="text-xs font-bold">{stats.docPercent}% Share</p>
                    </div>
                  </div>
                  <span className="font-black text-white">₹{stats.docGenerated.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-teal-500 shadow-[0_0_10px_rgba(20,184,166,0.5)]"></div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Agencies</p>
                      <p className="text-xs font-bold">{stats.agPercent}% Share</p>
                    </div>
                  </div>
                  <span className="font-black text-white">₹{stats.agGenerated.toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* TABS & MAIN TABLE */}
      <div className="bg-white dark:bg-slate-900 rounded-[32px] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
        <Tabs defaultValue="doctors" onValueChange={setActiveTab} className="w-full">
            <div className="p-6 md:p-8 flex flex-col md:flex-row justify-between items-center gap-6 border-b border-slate-50 dark:border-slate-800">
                <TabsList className="bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl h-auto">
                    <TabsTrigger value="doctors" className="h-10 px-6 rounded-xl font-bold uppercase text-[10px] tracking-widest flex items-center gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 data-[state=active]:shadow-sm">
                      <Stethoscope className="w-3.5 h-3.5"/> Doctors
                    </TabsTrigger>
                    <TabsTrigger value="agencies" className="h-10 px-6 rounded-xl font-bold uppercase text-[10px] tracking-widest flex items-center gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 data-[state=active]:shadow-sm">
                      <Building2 className="w-3.5 h-3.5"/> Agencies
                    </TabsTrigger>
                </TabsList>
                <div className="relative w-full md:w-80 group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 group-focus-within:text-indigo-600 transition-colors" />
                    <input
                        type="text"
                        placeholder={`Find ${activeTab}...`}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full h-12 pl-12 pr-6 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-indigo-600/10 outline-none transition-all"
                    />
                </div>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/50 dark:bg-slate-800/20">
                  <TableRow className="border-none">
                    <TableHead className="py-6 px-8 text-[10px] font-black uppercase tracking-widest text-slate-400">Referrer Identity</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">Margin Logic</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Outstanding (Unpaid)</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Settled (Lifetime)</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-right px-8">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-20 text-slate-400 italic font-medium">Accessing secure ledger...</TableCell></TableRow>
                  ) : filteredList.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-20 text-slate-400 italic font-medium">No partner records found.</TableCell></TableRow>
                  ) : (
                    filteredList.map((item: any) => {
                      const totalGen = item.totalPending + item.totalPaid;
                      const progress = totalGen > 0 ? (item.totalPaid / totalGen) * 100 : 0;
                      
                      return (
                      <TableRow key={item.id} className="group border-slate-50 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <TableCell className="px-8 py-5">
                          <div className="font-black text-slate-900 dark:text-white tracking-tight leading-none mb-1">{item.name}</div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{item.contact || 'No contact linked'}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="h-7 px-3 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-[10px] font-black uppercase tracking-tighter text-slate-500">
                            {item.commissionRule}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="font-black text-amber-600 text-lg tabular-nums leading-none mb-1">₹{item.totalPending.toLocaleString()}</div>
                          {item.pendingCount > 0 && <span className="text-[9px] font-black text-amber-500 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded uppercase tracking-tighter">{item.pendingCount} tests</span>}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="font-bold text-slate-700 dark:text-slate-300 mb-2 tabular-nums">₹{item.totalPaid.toLocaleString()}</div>
                          <div className="w-24 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full ml-auto overflow-hidden shadow-inner">
                              <div className="h-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)] transition-all duration-1000" style={{width: `${progress}%`}}></div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right px-8">
                          <Button 
                            onClick={() => handleOpenSettle(item)}
                            disabled={item.totalPending === 0}
                            className={`h-11 px-6 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 ${item.totalPending > 0 ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200 dark:shadow-none' : 'bg-slate-50 dark:bg-slate-800 text-slate-400'}`}
                          >
                            {item.totalPending > 0 ? 'Authorize Payout' : 'Cleared'}
                            <ChevronRight className="w-4 h-4 ml-2" />
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

      {/* SETTLEMENT MODAL */}
      <Dialog open={isSettleModalOpen} onOpenChange={setIsSettleModalOpen}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden bg-white dark:bg-slate-950 border-none shadow-2xl rounded-[32px]">
          <div className="bg-slate-900 p-8 flex items-center gap-5">
            <div className="h-14 w-14 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
              <Banknote className="h-7 w-7" />
            </div>
            <div>
              <DialogTitle className="text-white text-2xl font-black tracking-tight">Settle Funds</DialogTitle>
              <DialogDescription className="text-slate-400 font-medium italic">{selectedEntity?.name} • Settlement Protocol</DialogDescription>
            </div>
          </div>
          
          <div className="p-8 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 p-6 rounded-3xl">
                  <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1">Clearable Debt</p>
                  <p className="text-4xl font-black text-amber-700 dark:text-amber-500 tracking-tighter tabular-nums">₹{selectedEntity?.totalPending.toLocaleString()}</p>
              </div>
              
              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Payment Reference / UTR</Label>
                <div className="relative group">
                  <History className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-emerald-500 transition-colors" />
                  <Input 
                    placeholder="e.g. UPI-1294XJ" 
                    value={transactionRef} 
                    onChange={(e) => setTransactionRef(e.target.value)}
                    className="h-14 pl-12 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl font-bold shadow-inner"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
                <div className="flex items-center gap-2 px-1">
                  <Activity className="w-4 h-4 text-indigo-500" />
                  <h4 className="font-black text-[10px] uppercase tracking-widest text-slate-800 dark:text-slate-200">Awaiting Settlement Ledger</h4>
                </div>
                <div className="border border-slate-100 dark:border-slate-800 rounded-3xl bg-slate-50 dark:bg-slate-900/50 overflow-hidden shadow-inner max-h-[300px] overflow-y-auto custom-scrollbar">
                    <Table>
                        <TableHeader className="sticky top-0 bg-white dark:bg-slate-800 z-10">
                            <TableRow className="border-none h-12">
                                <TableHead className="text-[9px] font-black uppercase tracking-widest px-6">Timestamp</TableHead>
                                <TableHead className="text-[9px] font-black uppercase tracking-widest">Case Details</TableHead>
                                <TableHead className="text-[9px] font-black uppercase tracking-widest text-right px-6">Funds</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {selectedEntity?.recentCommissions.filter((c:any) => c.status === 'PENDING').map((comm: any) => (
                                <TableRow key={comm.id} className="border-slate-100 dark:border-slate-800 bg-white/40 dark:bg-transparent">
                                    <TableCell className="text-[11px] font-bold text-slate-400 tabular-nums px-6">{new Date(comm.test.createdAt).toLocaleDateString()}</TableCell>
                                    <TableCell className="py-4">
                                        <div className="text-xs font-black text-slate-800 dark:text-slate-200 tracking-tight">{comm.test?.patient?.name}</div>
                                        <div className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter italic">{comm.test?.testName}</div>
                                    </TableCell>
                                    <TableCell className="text-right font-black text-sm text-amber-600 px-6 tabular-nums">₹{comm.amount}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </div>
          </div>

          <DialogFooter className="p-8 pt-0 flex gap-3">
            <Button variant="ghost" onClick={() => setIsSettleModalOpen(false)} className="h-12 px-6 rounded-2xl font-bold text-slate-400">Discard</Button>
            <Button 
                onClick={handleSettleSubmit} 
                disabled={settleMutation.isPending || selectedEntity?.totalPending === 0}
                className="h-12 px-10 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black shadow-lg shadow-emerald-200 dark:shadow-none transition-all active:scale-95"
            >
                {settleMutation.isPending ? 'Processing...' : 'Confirm & Authorize Payout'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
      `}</style>
    </div>
  );
}