"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getExpenseDashboardData,
  addManualExpense,
  deleteManualExpense,
} from "@/actions/expense-management";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import {
  TrendingDown,
  Plus,
  FlaskConical,
  Stethoscope,
  Building2,
  BarChart3,
  PieChart,
  Trash2,
  Search,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Receipt,
  Wallet,
  ArrowDownRight,
  Filter,
} from "lucide-react";
import toast from "react-hot-toast";

const CATEGORIES = [
  { value: "SALARY", label: "Staff Salaries" },
  { value: "RENT", label: "Lab Rent" },
  { value: "UTILITIES", label: "Utilities (Electricity/Water)" },
  { value: "MACHINE_MAINTENANCE", label: "Machine Maintenance" },
  { value: "MARKETING", label: "Marketing & Ads" },
  { value: "OFFICE_SUPPLIES", label: "Office Supplies" },
  { value: "MISC", label: "Miscellaneous" },
];

const COLORS = [
  "#ef4444",
  "#f97316",
  "#f59e0b",
  "#84cc16",
  "#10b981",
  "#06b6d4",
  "#3b82f6",
  "#6366f1",
  "#8b5cf6",
  "#d946ef",
];

export default function ExpensesClient() {
  const queryClient = useQueryClient();

  /** 🔒 LOGIC PRESERVED */
  const [currentDate, setCurrentDate] = useState(new Date());
  const month = currentDate.getMonth() + 1;
  const year = currentDate.getFullYear();
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    category: "MISC",
    amount: "",
    paymentMode: "CASH",
    date: format(new Date(), "yyyy-MM-dd"),
    referenceNo: "",
    notes: "",
  });

  const { data, isLoading } = useQuery({
    queryKey: ["expenses", month, year],
    queryFn: async () => await getExpenseDashboardData(month, year),
  });

  const addMutation = useMutation({
    mutationFn: async (payload: any) => await addManualExpense(payload),
    onSuccess: () => {
      toast.success("Expense recorded successfully!");
      setIsAddOpen(false);
      setFormData({
        title: "",
        category: "MISC",
        amount: "",
        paymentMode: "CASH",
        date: format(new Date(), "yyyy-MM-dd"),
        referenceNo: "",
        notes: "",
      });
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
    },
    onError: (err: any) =>
      toast.error(err.message || "Failed to record expense."),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => await deleteManualExpense(id),
    onSuccess: () => {
      toast.success("Expense deleted");
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
    },
  });

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.amount)
      return toast.error("Please fill required fields");
    addMutation.mutate({
      ...formData,
      amount: Number(formData.amount),
      date: new Date(formData.date),
    });
  };

  const changeMonth = (offset: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + offset);
    setCurrentDate(newDate);
  };

  const filteredLedger =
    data?.unifiedLedger.filter(
      (item: any) =>
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category.toLowerCase().includes(searchTerm.toLowerCase()),
    ) || [];

  let currentAngle = 0;
  const pieGradients =
    data?.pieChartData && data.totalExpenses > 0
      ? data.pieChartData
          .map((slice: any, idx: number) => {
            const percentage = (slice.value / data.totalExpenses) * 100;
            const start = currentAngle;
            const end = currentAngle + percentage;
            currentAngle = end;
            return `${COLORS[idx % COLORS.length]} ${start}% ${end}%`;
          })
          .join(", ")
      : "transparent 0% 100%";

  /** 🎨 UI REIMAGINED */
  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-slate-950 px-6 py-4 md:px-10 md:py-8 xl:px-12 space-y-8">
      {/* HEADER SECTION */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900 text-red-600 dark:text-red-400">
            <TrendingDown className="h-3.5 w-3.5" />
            <span className="text-[10px] font-black uppercase tracking-widest">
              Financial Outflow
            </span>
          </div>
          <h1 className="text-4xl font-black text-foreground dark:text-primary-foreground tracking-tight">
            Expenses <span className="text-slate-400">&</span> Ledger
          </h1>
          <p className="text-muted-foreground font-medium">
            Monitoring reagents, commissions, and operational overhead.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <div className="flex items-center bg-card dark:bg-slate-900 rounded-2xl p-1.5 shadow-sm border border-border dark:border-slate-800">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-xl h-9 w-9"
              onClick={() => changeMonth(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="px-4 font-bold text-sm min-w-[140px] text-center text-foreground/80 dark:text-slate-200 uppercase tracking-tighter">
              {currentDate.toLocaleString("default", {
                month: "long",
                year: "numeric",
              })}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-xl h-9 w-9"
              onClick={() => changeMonth(1)}
              disabled={
                month === new Date().getMonth() + 1 &&
                year === new Date().getFullYear()
              }>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <Button
            onClick={() => setIsAddOpen(true)}
            className="h-12 px-6 bg-slate-900 hover:bg-black dark:bg-red-600 dark:hover:bg-red-700 text-primary-foreground rounded-2xl shadow-xl shadow-slate-200 dark:shadow-none transition-all active:scale-95">
            <Plus className="h-5 w-5 mr-2" />
            <span className="font-bold">Record Expense</span>
          </Button>
        </div>
      </div>

      {/* STATS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Highlight */}
        <div className="group bg-slate-900 dark:bg-red-600 p-6 rounded-3xl shadow-2xl shadow-slate-200 dark:shadow-none relative overflow-hidden transition-transform hover:-translate-y-1">
          <ArrowDownRight className="absolute -right-4 -bottom-4 w-32 h-32 text-white/10 rotate-12 group-hover:scale-110 transition-transform" />
          <p className="text-[10px] font-black text-white/60 uppercase tracking-widest mb-1">
            Total Burn
          </p>
          <h2 className="text-3xl font-black text-white tabular-nums tracking-tighter">
            ₹{(data?.totalExpenses || 0).toLocaleString()}
          </h2>
        </div>

        {[
          {
            label: "Operations",
            val: data?.totalOperational,
            icon: Building2,
            color: "text-primary",
            bg: "bg-primary/10",
          },
          {
            label: "Inventory",
            val: data?.totalInventory,
            icon: FlaskConical,
            color: "text-primary",
            bg: "bg-emerald-50",
          },
          {
            label: "Commissions",
            val: data?.totalCommissions,
            icon: Stethoscope,
            color: "text-violet-600",
            bg: "bg-violet-50",
          },
        ].map((stat, i) => (
          <div
            key={i}
            className="bg-card dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 transition-all hover:shadow-md">
            <div
              className={`w-10 h-10 ${stat.bg} dark:bg-slate-800 rounded-xl flex items-center justify-center mb-4`}>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <p className="text-[10px] font-black text-muted-foreground/70 uppercase tracking-widest mb-1">
              {stat.label}
            </p>
            <h2 className="text-2xl font-black text-foreground dark:text-slate-100 tabular-nums tracking-tighter">
              ₹{(stat.val || 0).toLocaleString()}
            </h2>
          </div>
        ))}
      </div>

      {/* VISUALS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Trend Chart */}
        <div className="lg:col-span-8 bg-card dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 p-6">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-sm font-black text-foreground dark:text-slate-200 uppercase tracking-widest flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-red-500" /> Daily Trend
            </h3>
          </div>

          {isLoading ? (
            <div className="h-64 flex items-center justify-center text-muted-foreground/70 font-medium italic">
              Synchronizing...
            </div>
          ) : (
            <div className="flex items-end gap-1.5 h-64 w-full pt-10 relative">
              <div className="absolute top-10 w-full border-t border-dashed border-slate-100 dark:border-slate-800"></div>
              <div className="absolute top-1/2 w-full border-t border-dashed border-slate-100 dark:border-slate-800"></div>

              {data?.barChartData?.map((dayData: any, idx: number) => (
                <div
                  key={idx}
                  className="flex-1 flex flex-col items-center justify-end h-full group relative">
                  <div className="opacity-0 group-hover:opacity-100 absolute -top-10 bg-slate-900 text-primary-foreground text-[10px] font-bold px-2 py-1 rounded-lg pointer-events-none transition-all z-20 whitespace-nowrap shadow-xl">
                    ₹{dayData.amount.toLocaleString()}
                  </div>
                  <div
                    className={`w-full max-w-[14px] rounded-t-full transition-all duration-700 ease-out delay-[${idx * 20}ms] ${dayData.amount > 0 ? "bg-gradient-to-t from-red-500 to-red-400" : "bg-muted/30 dark:bg-slate-800"}`}
                    style={{
                      height: `${Math.max(dayData.heightPercent, 4)}%`,
                    }}></div>
                  <span className="text-[9px] font-bold text-muted-foreground/70 mt-3 group-hover:text-red-500 transition-colors">
                    {dayData.day}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Categories Donut */}
        <div className="lg:col-span-4 bg-card dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 p-6 flex flex-col">
          <h3 className="text-sm font-black text-foreground dark:text-slate-200 uppercase tracking-widest flex items-center gap-2 mb-8">
            <PieChart className="w-4 h-4 text-red-500" /> Breakdown
          </h3>

          {!data || data.totalExpenses === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground/70 gap-2">
              <div className="w-20 h-20 rounded-full border-4 border-dashed border-slate-100 dark:border-slate-800" />
              <p className="text-xs font-medium italic">No data records</p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center">
              <div
                className="relative w-44 h-44 rounded-full mb-8"
                style={{ background: `conic-gradient(${pieGradients})` }}>
                <div className="absolute inset-6 bg-card dark:bg-slate-900 rounded-full flex flex-col items-center justify-center shadow-inner">
                  <span className="text-[10px] text-muted-foreground/70 font-black uppercase tracking-tighter">
                    Monthly Out
                  </span>
                  <span className="text-xl font-black text-foreground dark:text-slate-100 tabular-nums">
                    ₹{((data?.totalExpenses || 0) / 1000).toFixed(1)}k
                  </span>
                </div>
              </div>

              <div className="w-full space-y-3 overflow-y-auto max-h-[160px] custom-scrollbar pr-2">
                {data?.pieChartData.map((slice: any, idx: number) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-2 h-2 rounded-full shadow-sm"
                        style={{
                          backgroundColor: COLORS[idx % COLORS.length],
                        }}></div>
                      <span className="text-[11px] font-bold text-muted-foreground group-hover:text-foreground dark:group-hover:text-slate-200 transition-colors uppercase tracking-tight truncate max-w-[120px]">
                        {slice.name}
                      </span>
                    </div>
                    <span className="font-black text-xs text-foreground/80 dark:text-slate-300">
                      ₹{slice.value.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* LEDGER TABLE */}
      <div className="bg-card dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
        <div className="p-6 border-b border-slate-50 dark:border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-900 dark:bg-slate-800 rounded-xl">
              <Receipt className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-black text-foreground dark:text-slate-100 uppercase tracking-widest text-sm">
                Unified Ledger
              </h3>
              <p className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-tighter">
                Transaction History
              </p>
            </div>
          </div>

          <div className="relative w-full md:w-80 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/70 group-focus-within:text-red-500 transition-colors" />
            <input
              type="text"
              placeholder="Search expenses, categories, ref..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-muted/30 dark:bg-slate-800/50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-red-500/20 transition-all outline-none font-medium"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/50 dark:bg-slate-800/30">
              <TableRow className="border-none">
                <TableHead className="font-black text-[10px] uppercase tracking-widest py-4">
                  Timeline
                </TableHead>
                <TableHead className="font-black text-[10px] uppercase tracking-widest">
                  Entry Details
                </TableHead>
                <TableHead className="font-black text-[10px] uppercase tracking-widest">
                  Classification
                </TableHead>
                <TableHead className="font-black text-[10px] uppercase tracking-widest text-right">
                  Amount (INR)
                </TableHead>
                <TableHead className="font-black text-[10px] uppercase tracking-widest text-center">
                  Protocol
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center py-20 text-muted-foreground/70 italic">
                    Accessing secure ledger...
                  </TableCell>
                </TableRow>
              ) : filteredLedger.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center py-20 text-muted-foreground/70 italic">
                    No records found for this period.
                  </TableCell>
                </TableRow>
              ) : (
                filteredLedger.map((item: any) => (
                  <TableRow
                    key={item.id}
                    className="group border-slate-50 dark:border-slate-800 hover:bg-muted/30 dark:hover:bg-slate-800/50 transition-colors">
                    <TableCell className="py-4">
                      <div className="flex flex-col">
                        <span className="font-black text-xs text-foreground/80 dark:text-slate-300">
                          {format(new Date(item.date), "dd MMM")}
                        </span>
                        <span className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-tighter">
                          {format(new Date(item.date), "yyyy")}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span className="font-bold text-foreground dark:text-slate-200 text-sm max-w-[280px] truncate">
                          {item.title}
                        </span>
                        <div className="flex items-center gap-2">
                          {item.ref && (
                            <span className="text-[9px] font-mono text-muted-foreground/70 bg-muted dark:bg-slate-800 px-1.5 py-0.5 rounded uppercase">
                              Ref: {item.ref}
                            </span>
                          )}
                          {item.type === "COMMISSION" && (
                            <span className="text-[9px] font-bold text-purple-500 uppercase tracking-tighter">
                              Payout System
                            </span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="text-[9px] font-black uppercase tracking-tighter border-border dark:border-slate-700 text-muted-foreground">
                        {item.category.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {item.amount > 0 ? (
                        <span className="font-black text-sm text-red-600 tabular-nums">
                          ₹{item.amount.toLocaleString()}
                        </span>
                      ) : (
                        <div className="flex justify-end">
                          <Badge className="bg-amber-50 text-amber-600 border-amber-100 text-[9px] font-black uppercase flex gap-1">
                            <AlertCircle className="w-3 h-3" /> Cost Pending
                          </Badge>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-center">
                        {item.type === "OPERATIONAL" ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              if (confirm("Permanent removal of this entry?"))
                                deleteMutation.mutate(item.id);
                            }}
                            className="text-slate-300 hover:text-red-600 h-8 w-8 rounded-xl hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Badge className="bg-muted dark:bg-slate-800 text-muted-foreground/70 dark:text-muted-foreground border-0 text-[8px] font-black uppercase tracking-widest">
                            System Lock
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* FORM MODAL */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-lg bg-card dark:bg-slate-950 p-0 overflow-hidden border-none shadow-2xl rounded-3xl">
          <div className="bg-slate-900 p-6 flex items-center gap-4">
            <div className="p-3 bg-red-600 rounded-2xl">
              <Wallet className="w-6 h-6 text-white" />
            </div>
            <div>
              <DialogTitle className="text-white text-xl font-black tracking-tight">
                Record Expense
              </DialogTitle>
              <p className="text-muted-foreground/70 text-xs font-medium italic">
                Manual operational entry protocol
              </p>
            </div>
          </div>

          <form onSubmit={handleAddSubmit} className="p-8 space-y-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                Expense Description
              </Label>
              <Input
                placeholder="e.g. Facility Maintenance, Consumables"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                required
                className="h-12 bg-muted/30 dark:bg-slate-900 border-none rounded-2xl focus-visible:ring-red-500/20 font-bold"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                  Amount (₹)
                </Label>
                <div className="relative">
                  <Input
                    type="number"
                    min="1"
                    placeholder="0"
                    value={formData.amount}
                    onChange={(e) =>
                      setFormData({ ...formData, amount: e.target.value })
                    }
                    required
                    className="h-12 bg-muted/30 dark:bg-slate-900 border-none rounded-2xl focus-visible:ring-red-500/20 font-black pl-8"
                  />
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/70 font-bold">
                    ₹
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                  Date
                </Label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) =>
                    setFormData({ ...formData, date: e.target.value })
                  }
                  required
                  className="h-12 bg-muted/30 dark:bg-slate-900 border-none rounded-2xl focus-visible:ring-red-500/20 font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                  Category
                </Label>
                <Select
                  value={formData.category}
                  onValueChange={(v) =>
                    setFormData({ ...formData, category: v })
                  }>
                  <SelectTrigger className="h-12 bg-muted/30 dark:bg-slate-900 border-none rounded-2xl font-bold uppercase text-[10px] tracking-widest">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-none shadow-xl">
                    {CATEGORIES.map((c) => (
                      <SelectItem
                        key={c.value}
                        value={c.value}
                        className="font-bold text-[10px] uppercase tracking-widest">
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                  Payment Mode
                </Label>
                <Select
                  value={formData.paymentMode}
                  onValueChange={(v) =>
                    setFormData({ ...formData, paymentMode: v })
                  }>
                  <SelectTrigger className="h-12 bg-muted/30 dark:bg-slate-900 border-none rounded-2xl font-bold uppercase text-[10px] tracking-widest">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-none shadow-xl">
                    <SelectItem
                      value="CASH"
                      className="font-bold text-[10px] uppercase tracking-widest">
                      Cash
                    </SelectItem>
                    <SelectItem
                      value="BANK_TRANSFER"
                      className="font-bold text-[10px] uppercase tracking-widest">
                      UPI / Transfer
                    </SelectItem>
                    <SelectItem
                      value="CARD"
                      className="font-bold text-[10px] uppercase tracking-widest">
                      Card
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                Ref / Invoice No (Optional)
              </Label>
              <Input
                placeholder="REF_7721"
                value={formData.referenceNo}
                onChange={(e) =>
                  setFormData({ ...formData, referenceNo: e.target.value })
                }
                className="h-12 bg-muted/30 dark:bg-slate-900 border-none rounded-2xl focus-visible:ring-red-500/20 font-mono text-xs"
              />
            </div>

            <DialogFooter className="pt-6">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsAddOpen(false)}
                className="h-12 rounded-2xl font-bold text-slate-400">
                Discard
              </Button>
              <Button
                type="submit"
                className="h-12 px-8 bg-red-600 hover:bg-red-700 text-primary-foreground rounded-2xl font-black shadow-lg shadow-red-200 dark:shadow-none"
                disabled={addMutation.isPending}>
                {addMutation.isPending
                  ? "Authenticating..."
                  : "Authorize Entry"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
}
