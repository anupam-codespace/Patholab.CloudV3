'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getExpenseDashboardData, addManualExpense, deleteManualExpense } from '@/actions/expense-management';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { 
  TrendingDown, Plus, FlaskConical, Stethoscope, 
  Building2, BarChart3, PieChart, Trash2, Search, AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

const CATEGORIES = [
  { value: 'SALARY', label: 'Staff Salaries' },
  { value: 'RENT', label: 'Lab Rent' },
  { value: 'UTILITIES', label: 'Utilities (Electricity/Water)' },
  { value: 'MACHINE_MAINTENANCE', label: 'Machine Maintenance' },
  { value: 'MARKETING', label: 'Marketing & Ads' },
  { value: 'OFFICE_SUPPLIES', label: 'Office Supplies' },
  { value: 'MISC', label: 'Miscellaneous' },
];

const COLORS = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#d946ef'];

export default function ExpensesDashboard() {
  const queryClient = useQueryClient();
  
  // Date Filters
  const [currentDate, setCurrentDate] = useState(new Date());
  const month = currentDate.getMonth() + 1;
  const year = currentDate.getFullYear();

  // Search & Modal State
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({
    title: '', category: 'MISC', amount: '', paymentMode: 'CASH', 
    date: format(new Date(), 'yyyy-MM-dd'), referenceNo: '', notes: ''
  });

  // Fetch Data
  const { data, isLoading } = useQuery({
    queryKey: ['expenses', month, year],
    queryFn: async () => await getExpenseDashboardData(month, year)
  });

  // Mutations
  const addMutation = useMutation({
    mutationFn: async (payload: any) => await addManualExpense(payload),
    onSuccess: () => {
      toast.success("Expense recorded successfully!");
      setIsAddOpen(false);
      setFormData({ title: '', category: 'MISC', amount: '', paymentMode: 'CASH', date: format(new Date(), 'yyyy-MM-dd'), referenceNo: '', notes: ''});
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
    },
    onError: (err: any) => toast.error(err.message || "Failed to record expense.")
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => await deleteManualExpense(id),
    onSuccess: () => {
      toast.success("Expense deleted");
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
    }
  });

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.amount) return toast.error("Please fill required fields");
    addMutation.mutate({
      ...formData,
      amount: Number(formData.amount),
      date: new Date(formData.date)
    });
  };

  const changeMonth = (offset: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + offset);
    setCurrentDate(newDate);
  };

  const filteredLedger = data?.unifiedLedger.filter((item: any) => 
    item.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    item.category.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  // SAFE GRADIENT CALCULATION
  let currentAngle = 0;
  const pieGradients = (data?.pieChartData && data.totalExpenses > 0) 
    ? data.pieChartData.map((slice: any, idx: number) => {
        const percentage = (slice.value / data.totalExpenses) * 100;
        const start = currentAngle;
        const end = currentAngle + percentage;
        currentAngle = end;
        return `${COLORS[idx % COLORS.length]} ${start}% ${end}%`;
      }).join(', ') 
    : 'transparent 0% 100%';

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      
      {/* HEADER & FILTERS */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <TrendingDown className="h-6 w-6 text-red-500"/> Expenses & Outflow
          </h1>
          <p className="text-sm text-slate-500 mt-1">Track reagents, commissions, and operational costs.</p>
        </div>
        
        <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="flex items-center bg-slate-50 rounded-lg p-1 border">
                <Button variant="ghost" size="sm" onClick={() => changeMonth(-1)}>&lt;</Button>
                <div className="px-4 font-bold text-sm min-w-[120px] text-center">
                    {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                </div>
                <Button variant="ghost" size="sm" onClick={() => changeMonth(1)} disabled={month === new Date().getMonth() + 1 && year === new Date().getFullYear()}>&gt;</Button>
            </div>
            <Button onClick={() => setIsAddOpen(true)} className="bg-red-600 hover:bg-red-700 text-white shadow-md">
                <Plus className="h-4 w-4 mr-2" /> Record Expense
            </Button>
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-red-200 flex flex-col justify-center relative overflow-hidden">
            <div className="absolute -right-6 -top-6 bg-red-50 w-24 h-24 rounded-full opacity-50"></div>
            <p className="text-[11px] font-bold text-red-600 uppercase tracking-wider mb-1">Total Expenses</p>
            <h2 className="text-3xl font-black text-slate-900">₹{(data?.totalExpenses || 0).toLocaleString()}</h2>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-center">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1"><Building2 className="w-3 h-3"/> Operations</p>
            <h2 className="text-2xl font-black text-slate-800">₹{(data?.totalOperational || 0).toLocaleString()}</h2>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-center">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1"><FlaskConical className="w-3 h-3"/> Inventory / Reagents</p>
            <h2 className="text-2xl font-black text-slate-800">₹{(data?.totalInventory || 0).toLocaleString()}</h2>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-center">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1"><Stethoscope className="w-3 h-3"/> Payouts (Commissions)</p>
            <h2 className="text-2xl font-black text-slate-800">₹{(data?.totalCommissions || 0).toLocaleString()}</h2>
        </div>
      </div>

      {/* CHARTS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* DAILY BAR CHART */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 p-5 flex flex-col">
              <h3 className="text-sm font-bold text-slate-800 mb-6 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-slate-500"/> Daily Expense Trend</h3>
              {isLoading ? <div className="flex-1 flex items-center justify-center text-slate-400">Loading...</div> : (
                  <div className="flex-1 flex items-end gap-1 sm:gap-2 h-48 mt-auto pt-4 border-b border-slate-100 relative">
                      {/* Grid Lines */}
                      <div className="absolute top-0 w-full border-t border-dashed border-slate-100"></div>
                      <div className="absolute top-1/2 w-full border-t border-dashed border-slate-100"></div>
                      
                      {data?.barChartData?.map((dayData: any, idx: number) => (
                          <div key={idx} className="flex-1 flex flex-col items-center justify-end h-full group relative">
                              {/* Tooltip */}
                              <div className="opacity-0 group-hover:opacity-100 absolute -top-8 bg-slate-800 text-white text-[10px] px-2 py-1 rounded pointer-events-none transition-opacity z-10 whitespace-nowrap">
                                  ₹{dayData.amount.toLocaleString()}
                              </div>
                              {/* Bar */}
                              <div 
                                className={`w-full max-w-[24px] rounded-t-sm transition-all duration-500 ${dayData.amount > 0 ? 'bg-red-400 hover:bg-red-500' : 'bg-transparent'}`}
                                style={{ height: `${Math.max(dayData.heightPercent, 1)}%` }}
                              ></div>
                              <span className="text-[8px] text-slate-400 mt-2">{dayData.day}</span>
                          </div>
                      ))}
                  </div>
              )}
          </div>

          {/* CATEGORY DONUT CHART */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 flex flex-col">
              <h3 className="text-sm font-bold text-slate-800 mb-6 flex items-center gap-2"><PieChart className="w-4 h-4 text-slate-500"/> Expense by Category</h3>
              
              {!data || data.totalExpenses === 0 ? (
                  <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">No expenses this month</div>
              ) : (
                  <div className="flex-1 flex flex-col items-center justify-center">
                      {/* CSS Donut Chart */}
                      <div className="relative w-36 h-36 rounded-full mb-6 shadow-inner" style={{ background: `conic-gradient(${pieGradients})`}}>
                          <div className="absolute inset-4 bg-white rounded-full flex items-center justify-center flex-col shadow-sm">
                             <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total</span>
                             <span className="text-xs font-black text-slate-800">₹{((data?.totalExpenses || 0) / 1000).toFixed(1)}k</span>
                          </div>
                      </div>

                      <div className="w-full space-y-2 max-h-32 overflow-y-auto pr-2">
                          {data?.pieChartData.map((slice: any, idx: number) => (
                              <div key={idx} className="flex items-center justify-between text-[11px]">
                                  <div className="flex items-center gap-2 text-slate-600 truncate">
                                      <div className="w-2.5 h-2.5 rounded-full" style={{backgroundColor: COLORS[idx % COLORS.length]}}></div> 
                                      {slice.name}
                                  </div>
                                  <span className="font-bold text-slate-800 whitespace-nowrap">₹{slice.value.toLocaleString()}</span>
                              </div>
                          ))}
                      </div>
                  </div>
              )}
          </div>
      </div>

      {/* UNIFIED LEDGER TABLE */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
         <div className="p-4 border-b flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-50/50">
            <h3 className="font-bold text-slate-800">Unified Expense Ledger</h3>
            <div className="relative w-full md:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                    type="text"
                    placeholder="Search expenses..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
            </div>
         </div>

         <div className="overflow-x-auto">
            <Table>
               <TableHeader className="bg-slate-50">
                  <TableRow>
                     <TableHead className="font-semibold">Date</TableHead>
                     <TableHead className="font-semibold">Description</TableHead>
                     <TableHead className="font-semibold">Category</TableHead>
                     <TableHead className="font-semibold">Source</TableHead>
                     <TableHead className="font-semibold text-right">Amount</TableHead>
                     <TableHead className="font-semibold text-right">Action</TableHead>
                  </TableRow>
               </TableHeader>
               <TableBody>
                  {isLoading ? (
                     <TableRow><TableCell colSpan={6} className="text-center py-10 text-slate-500">Loading ledger...</TableCell></TableRow>
                  ) : filteredLedger.length === 0 ? (
                     <TableRow><TableCell colSpan={6} className="text-center py-10 text-slate-500">No records found for this period.</TableCell></TableRow>
                  ) : (
                     filteredLedger.map((item: any) => (
                        <TableRow key={item.id} className="hover:bg-slate-50">
                           <TableCell className="text-xs text-slate-500 whitespace-nowrap">
                              {format(new Date(item.date), 'dd MMM, yy')}
                           </TableCell>
                           <TableCell>
                              <div className="font-bold text-slate-800 text-sm max-w-[250px] truncate" title={item.title}>{item.title}</div>
                              <div className="text-[10px] text-slate-400 font-mono mt-0.5">Ref: {item.ref}</div>
                           </TableCell>
                           <TableCell>
                              <Badge variant="outline" className="bg-white text-[10px]">{item.category.replace('_', ' ')}</Badge>
                           </TableCell>
                           <TableCell>
                              {item.type === 'OPERATIONAL' && <Badge className="bg-slate-100 text-slate-600 hover:bg-slate-100 border-0 text-[9px]">Manual</Badge>}
                              {item.type === 'COMMISSION' && <Badge className="bg-purple-50 text-purple-600 hover:bg-purple-50 border-0 text-[9px]">Auto-Commission</Badge>}
                              {item.type === 'INVENTORY' && <Badge className="bg-blue-50 text-blue-600 hover:bg-blue-50 border-0 text-[9px]">Auto-Inventory</Badge>}
                           </TableCell>
                           <TableCell className="text-right">
                              {/* ✅ FIX: Smart Badge if amount is 0 */}
                              {item.amount > 0 ? (
                                <span className="font-bold text-red-600">₹{item.amount.toLocaleString()}</span>
                              ) : (
                                <Badge variant="secondary" className="bg-yellow-50 text-yellow-700 border-yellow-200 text-[9px] flex items-center gap-1 w-fit ml-auto">
                                    <AlertCircle className="w-3 h-3"/> No Cost Defined
                                </Badge>
                              )}
                           </TableCell>
                           <TableCell className="text-right">
                              {item.type === 'OPERATIONAL' ? (
                                 <Button variant="ghost" size="icon" onClick={() => { if(confirm("Delete this expense?")) deleteMutation.mutate(item.id); }} className="text-slate-400 hover:text-red-600 h-8 w-8">
                                    <Trash2 className="h-4 w-4" />
                                 </Button>
                              ) : (
                                 <span className="text-[10px] text-slate-400 italic px-2">Locked</span>
                              )}
                           </TableCell>
                        </TableRow>
                     ))
                  )}
               </TableBody>
            </Table>
         </div>
      </div>

      {/* ADD MANUAL EXPENSE MODAL */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle>Record Manual Expense</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddSubmit} className="space-y-4 pt-4">
            
            <div className="space-y-1.5">
               <label className="text-xs font-bold text-slate-500 uppercase">Expense Description *</label>
               <Input placeholder="e.g. November Rent, Printer Ink..." value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} required />
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">Amount (₹) *</label>
                  <Input type="number" min="1" placeholder="0.00" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} required />
               </div>
               <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">Date *</label>
                  <Input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} required />
               </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">Category</label>
                  <Select value={formData.category} onValueChange={(v) => setFormData({...formData, category: v})}>
                     <SelectTrigger><SelectValue/></SelectTrigger>
                     <SelectContent>
                        {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                     </SelectContent>
                  </Select>
               </div>
               <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">Payment Mode</label>
                  <Select value={formData.paymentMode} onValueChange={(v) => setFormData({...formData, paymentMode: v})}>
                     <SelectTrigger><SelectValue/></SelectTrigger>
                     <SelectContent>
                        <SelectItem value="CASH">Cash</SelectItem>
                        <SelectItem value="BANK_TRANSFER">Bank Transfer / UPI</SelectItem>
                        <SelectItem value="CARD">Credit / Debit Card</SelectItem>
                     </SelectContent>
                  </Select>
               </div>
            </div>

            <div className="space-y-1.5">
               <label className="text-xs font-bold text-slate-500 uppercase">Invoice / Ref No (Optional)</label>
               <Input placeholder="INV-12345" value={formData.referenceNo} onChange={e => setFormData({...formData, referenceNo: e.target.value})} />
            </div>

            <DialogFooter className="mt-6 border-t pt-4">
               <Button type="button" variant="ghost" onClick={() => setIsAddOpen(false)}>Cancel</Button>
               <Button type="submit" className="bg-red-600 hover:bg-red-700 text-white" disabled={addMutation.isPending}>
                  {addMutation.isPending ? 'Saving...' : 'Save Expense'}
               </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  );
}