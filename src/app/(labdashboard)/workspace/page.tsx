"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  DollarSign,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Receipt,
  CheckCircle2,
  Package,
  MapPin,
  Clock,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

// --- SCHEMA FOR LAB SETUP ---
const labSetupSchema = z.object({
  labName: z.string().min(2, "Name required"),
  licenseNumber: z.string().min(3, "License required"),
});

const formatCurrency = (val: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumSignificantDigits: 10,
  }).format(val);

export default function LabOwnerDashboard() {
  const router = useRouter();
  const [dateRange, setDateRange] = useState("30D");

  const [showSetupModal, setShowSetupModal] = useState(false);
  const setupForm = useForm({ resolver: zodResolver(labSetupSchema) });

  // 1. DATA FETCHING
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["lab-dashboard", dateRange],
    queryFn: async () => {
      const res = await fetch(`/api/labs/dashboard?range=${dateRange}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load");
      return json;
    },
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (data?.status === "PENDING_SETUP") setShowSetupModal(true);
  }, [data]);

  const onSetupSubmit = async (formData: any) => {
    try {
      const res = await fetch("/api/lab/setup", {
        method: "POST",
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error("Failed to save");
      toast.success("Lab Setup Complete!");
      setShowSetupModal(false);
      refetch();
    } catch (e) {
      toast.error("Failed to save details");
    }
  };

  if (isLoading) return <DashboardSkeleton />;
  if (isError)
    return (
      <div className="p-10 text-center text-red-500">
        Failed to load dashboard data.
      </div>
    );

  const { kpi, charts, alerts, recentPatients, user } = data || {};

  // Resolve the names safely
  const userName = user?.name || "Manager";
  const branchName =
    user?.branchName || data?.labDetails?.name || "Main Branch";

  return (
    <div className="space-y-6 p-4 md:p-8 min-h-screen bg-slate-50/50">
      {/* HEADER: Personalized Welcome */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            Welcome back, {userName} 👋
          </h1>
          <p className="text-sm font-bold text-indigo-600 mt-1.5 flex items-center gap-1.5 bg-indigo-50 w-max px-2.5 py-1 rounded-md">
            <MapPin className="w-3.5 h-3.5" /> {branchName}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[180px] bg-slate-50 border-slate-200 shadow-sm font-medium">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODAY">Today</SelectItem>
              <SelectItem value="7D">Last 7 Days</SelectItem>
              <SelectItem value="30D">Last 30 Days</SelectItem>
              <SelectItem value="MONTH">This Month (Calendar)</SelectItem>
              <SelectItem value="YEAR">This Year (Calendar)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* FINANCIAL KPI CARDS */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute -right-4 -top-4 bg-emerald-50 w-24 h-24 rounded-full opacity-50"></div>
          <CardHeader className="pb-2">
            <CardTitle className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1">
              <DollarSign className="w-3 h-3" /> Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-slate-900">
              {formatCurrency(kpi?.revenue || 0)}
            </div>
            <p className="text-xs text-emerald-600 mt-1 flex items-center font-semibold">
              <ArrowUpRight className="w-3 h-3 mr-1" /> Cash In
            </p>
          </CardContent>
        </Card>

        <Card
          className="border-slate-200 shadow-sm relative overflow-hidden cursor-pointer hover:border-red-300 transition-colors"
          onClick={() => router.push("/workspace/expenses")}>
          <div className="absolute -right-4 -top-4 bg-red-50 w-24 h-24 rounded-full opacity-50"></div>
          <CardHeader className="pb-2">
            <CardTitle className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1">
              <Receipt className="w-3 h-3" /> Total Expenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-slate-900">
              {formatCurrency(kpi?.expense || 0)}
            </div>
            <p className="text-xs text-red-500 mt-1 flex items-center font-semibold">
              <ArrowDownRight className="w-3 h-3 mr-1" /> Cash Out
            </p>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50/30 shadow-sm relative overflow-hidden">
          <div className="absolute -right-4 -top-4 bg-blue-100 w-24 h-24 rounded-full opacity-50"></div>
          <CardHeader className="pb-2">
            <CardTitle className="text-[11px] font-bold text-blue-600 uppercase flex items-center gap-1">
              <Wallet className="w-3 h-3" /> Net Profit
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-blue-900">
              {formatCurrency(kpi?.profit || 0)}
            </div>
            <p className="text-xs text-blue-600 mt-1 font-semibold">
              Revenue minus Expenses
            </p>
          </CardContent>
        </Card>

        <Card className="border-orange-200 bg-orange-50/30 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-[11px] font-bold text-orange-600 uppercase">
              Pending Dues
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-orange-700">
              {formatCurrency(kpi?.pendingRevenue || 0)}
            </div>
            <p className="text-xs text-orange-600 mt-1 font-semibold">
              Uncollected Payments
            </p>
          </CardContent>
        </Card>
      </div>

      {/* CHARTS ROW */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Financial Trend Chart */}
        <Card className="lg:col-span-2 shadow-sm border-slate-200">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-4">
              Revenue vs Expense Trend
              <div className="flex items-center gap-3 text-[10px] font-medium uppercase tracking-wider text-slate-500">
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-emerald-500"></div>{" "}
                  Revenue
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-red-500"></div>{" "}
                  Expense
                </span>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={charts?.trend || []}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#e2e8f0"
                />
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  className="text-xs text-slate-500"
                  tickMargin={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  className="text-xs text-slate-500"
                  tickFormatter={(v) => `₹${v}`}
                  width={60}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: "8px",
                    border: "none",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                  }}
                />
                <Area
                  type="monotone"
                  name="Revenue"
                  dataKey="revenue"
                  stroke="#10b981"
                  strokeWidth={3}
                  fill="url(#colorRev)"
                />
                <Area
                  type="monotone"
                  name="Expense"
                  dataKey="expense"
                  stroke="#ef4444"
                  strokeWidth={3}
                  fill="url(#colorExp)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Status Pie Chart */}
        <Card className="shadow-sm border-slate-200 flex flex-col">
          <CardHeader>
            <CardTitle className="text-base">
              Test Status Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 min-h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={charts?.statusDistribution || []}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value">
                  {(charts?.statusDistribution || []).map(
                    (entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ),
                  )}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* OPERATIONS ROW */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Test Volume Chart */}
        <Card className="md:col-span-2 shadow-sm border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base">Test Volume</CardTitle>
              <p className="text-xs text-slate-500 mt-1">
                Total {kpi?.totalTests} tests processed
              </p>
            </div>
            <div className="flex items-center gap-4 text-sm font-bold text-slate-700">
              <span className="flex items-center gap-1">
                <Activity className="w-4 h-4 text-purple-600" />{" "}
                {kpi?.completedToday} Completed Today
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4 text-orange-500" />{" "}
                {kpi?.pendingReports} Pending
              </span>
            </div>
          </CardHeader>
          <CardContent className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts?.trend || []}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#e2e8f0"
                />
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  className="text-xs text-slate-500"
                  tickMargin={10}
                />
                <Tooltip
                  cursor={{ fill: "#f8fafc" }}
                  contentStyle={{
                    borderRadius: "8px",
                    border: "none",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                  }}
                />
                <Bar
                  dataKey="tests"
                  name="Tests Performed"
                  fill="#6366f1"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Inventory Status */}
        <Card className="shadow-sm border-slate-200 flex flex-col bg-white">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-slate-800 flex items-center justify-between text-base">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-blue-600" /> Inventory Status
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 flex-1 overflow-y-auto max-h-[250px]">
            {alerts?.totalTrackedItems === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-sm text-slate-500 gap-2 opacity-80 text-center py-4">
                <Package className="h-8 w-8 mb-1 opacity-40 text-slate-400" />
                <p className="font-semibold text-slate-700">Catalog is Empty</p>
                <p className="text-xs mb-2">Add items to track stock levels.</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push("/workspace/inventory")}
                  className="text-blue-600 border-blue-200 hover:bg-blue-50">
                  Setup Inventory &rarr;
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {alerts?.inventory?.map((item: any) => (
                  <div
                    key={item.id}
                    className="flex justify-between items-center text-sm border-b border-slate-50 pb-2 last:border-0">
                    <span
                      className="font-medium text-slate-700 truncate pr-2"
                      title={item.name}>
                      {item.name}
                    </span>

                    {item.isCritical ? (
                      <Badge
                        variant="destructive"
                        className="h-5 text-[10px] shrink-0">
                        Out of Stock
                      </Badge>
                    ) : item.isLowStock ? (
                      <Badge
                        variant="secondary"
                        className="h-5 text-[10px] bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-100 shrink-0">
                        Low: {item.currentStock} {item.unit}
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="h-5 text-[10px] bg-green-50 text-green-700 border-green-200 shrink-0">
                        Healthy: {item.currentStock} {item.unit}
                      </Badge>
                    )}
                  </div>
                ))}

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push("/workspace/inventory")}
                  className="w-full text-blue-600 hover:bg-blue-50 hover:text-blue-700 mt-2">
                  Manage All Inventory &rarr;
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* RECENT PATIENTS - Full Width */}
      <Card className="shadow-sm border-slate-200 bg-white w-full">
        <CardHeader className="pb-3 border-b border-slate-100 flex flex-row justify-between items-center bg-slate-50/50">
          <CardTitle className="text-base text-slate-800">
            Recent Patients
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="text-blue-600 hover:bg-blue-50 font-bold"
            onClick={() => router.push("/workspace/patients")}>
            View All Patients &rarr;
          </Button>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentPatients?.length > 0 ? (
              recentPatients.map((patient: any) => (
                <div
                  key={patient.id}
                  className="flex items-center justify-between group cursor-pointer hover:bg-slate-50 p-3 rounded-xl transition-colors border border-slate-100 hover:border-blue-200 shadow-sm"
                  onClick={() =>
                    router.push(`/workspace/patients/${patient.id}`)
                  }>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 bg-blue-50 border border-blue-100 text-blue-600 font-bold shadow-sm">
                      <AvatarFallback>{patient.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                        {patient.name}
                      </p>
                      <p className="text-[11px] font-medium text-slate-500 mt-0.5">
                        {patient.contact} • {patient.details}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant="secondary"
                    className="text-[10px] bg-white border shadow-sm text-slate-600 px-2 py-1">
                    {patient.testsCount} Tests
                  </Badge>
                </div>
              ))
            ) : (
              <div className="col-span-full text-center text-sm text-slate-500 py-10 flex flex-col items-center gap-2">
                <div className="bg-slate-50 p-3 rounded-full mb-1">
                  <Activity className="h-6 w-6 text-slate-300" />
                </div>
                No recent patients found.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* --- MODAL FOR LAB SETUP --- */}
      
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="p-8 space-y-8 min-h-screen bg-slate-50/50">
      <div className="flex flex-col md:flex-row justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-5 w-32" />
        </div>
        <Skeleton className="h-10 w-[180px]" />
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Skeleton className="col-span-2 h-[400px] rounded-xl" />
        <Skeleton className="col-span-1 h-[400px] rounded-xl" />
      </div>
    </div>
  );
}
