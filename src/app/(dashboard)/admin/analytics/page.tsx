"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  format,
  subDays,
  startOfDay,
  endOfDay,
  startOfYear,
  startOfMonth,
  endOfMonth,
} from "date-fns";
import { motion } from "framer-motion";
import { saveAs } from "file-saver";
import toast from "react-hot-toast";
import {
  Calendar as CalendarIcon,
  RefreshCcw,
  Users,
  Activity,
  DollarSign,
  FileSpreadsheet,
  TrendingUp,
  TrendingDown,
  Building2,
  Clock,
  AlertTriangle,
  Layers,
  TestTube,
  PieChart as PieChartIcon,
  BarChart3,
  Wallet,
  ShieldAlert, // <-- New Icon for Disease Alerts
  Flame,      // <-- New Icon for Spikes
} from "lucide-react";

// UI Components
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

// Charts
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

// --- CONSTANTS & UTILS ---
const COLORS = [
  "#10b981", // Emerald
  "#3b82f6", // Blue
  "#8b5cf6", // Purple
  "#f59e0b", // Amber
  "#ec4899", // Pink
  "#06b6d4", // Cyan
  "#f43f5e", // Rose
];

const formatCurrency = (val: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(val);

// Animations
const containerVar = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const itemVar = {
  hidden: { y: 20, opacity: 0 },
  show: { y: 0, opacity: 1 },
};

export default function AdvancedAnalyticsPage() {
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [activeTab, setActiveTab] = useState("30d");

  // DATA FETCHING
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["advanced-analytics", dateRange],
    queryFn: async () => {
      const params = new URLSearchParams({
        from: dateRange.from.toISOString(),
        to: dateRange.to.toISOString(),
      });
      const res = await fetch(`/api/admin/analytics?${params}`);
      if (!res.ok) throw new Error("Failed to load data");
      return res.json();
    },
    placeholderData: (prev) => prev,
    refetchInterval: 30_000,
    refetchIntervalInBackground: true,
  });

  // HANDLERS
  const handlePresetChange = (value: string) => {
    setActiveTab(value);
    const now = new Date();
    switch (value) {
      case "today":
        setDateRange({ from: startOfDay(now), to: endOfDay(now) });
        break;
      case "yesterday":
        setDateRange({
          from: startOfDay(subDays(now, 1)),
          to: endOfDay(subDays(now, 1)),
        });
        break;
      case "7d":
        setDateRange({ from: subDays(now, 7), to: now });
        break;
      case "30d":
        setDateRange({ from: subDays(now, 30), to: now });
        break;
      case "month":
        setDateRange({ from: startOfMonth(now), to: endOfMonth(now) });
        break;
      case "year":
        setDateRange({ from: startOfYear(now), to: now });
        break;
    }
  };

  // EXCEL EXPORT
  const handleExport = async () => {
    if (!data) return;

    const fromStr = dateRange.from.toISOString();
    const toStr = dateRange.to.toISOString();

    try {
      toast.loading("Generating comprehensive Excel report...", {
        id: "excel-export",
      });

      const response = await fetch(
        `/api/admin/analytics/export/excel?from=${fromStr}&to=${toStr}`,
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      const blob = await response.blob();
      saveAs(blob, `Patholab_GodMode_${format(new Date(), "yyyyMMdd")}.xlsx`);
      toast.success("Excel downloaded successfully", { id: "excel-export" });
    } catch (error: any) {
      console.error("EXCEL EXPORT FAILED:", error);
      toast.error(`Export failed: ${error.message}`, { id: "excel-export" });
    }
  };

  if (isLoading && !data) return <AnalyticsSkeleton />;

  // Safely default empty data structures to prevent crashes
  const safeData = {
    kpi: data?.kpi || {
      revenue: 0,
      consumed: 0,
      activeLabs: 0,
      lowBalanceLabs: 0,
      tests: 0,
      patients: 0,
      avgTat: "0h",
      rejectionRate: "0%",
    },
    charts: {
      revenueOverTime: data?.charts?.revenueOverTime || [],
      revenueByTopLabs: data?.charts?.revenueByTopLabs || [],
      geoData: data?.charts?.geoData || [],
      popularTests: data?.charts?.popularTests || [],
      demographics: data?.charts?.demographics || { gender: [], age: [] },
      userRoles: data?.charts?.userRoles || [],
      // NEW: Fallback for epidemiological data structure if backend is still catching up
      diseaseTrends: data?.charts?.diseaseTrends || [
        
      ],
    },
    topPerformers: data?.topPerformers || [],
  };

  return (
    <motion.div
      id="analytics-dashboard-container"
      variants={containerVar}
      initial="hidden"
      animate="show"
      className="space-y-6 p-4 md:p-8 min-h-screen bg-slate-50/50 text-slate-900">
      
      {/* --- HEADER CONTROLS --- */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 flex items-center gap-2">
            <BarChart3 className="h-8 w-8 text-emerald-600" /> Platform
            Intelligence
          </h1>
          <p className="text-slate-500 mt-1 font-medium">
            Deep-dive metrics from{" "}
            <span className="font-bold text-emerald-600">
              {format(dateRange.from, "MMM dd")}
            </span>{" "}
            to{" "}
            <span className="font-bold text-emerald-600">
              {format(dateRange.to, "MMM dd, yyyy")}
            </span>
          </p>
        </div>

        <div id="no-print" className="flex flex-wrap items-center gap-2">
          <Tabs
            value={activeTab}
            onValueChange={handlePresetChange}
            className="hidden lg:block bg-white shadow-sm rounded-xl p-1 border border-slate-200">
            <TabsList className="bg-transparent h-9">
              <TabsTrigger
                value="7d"
                className="data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700 rounded-lg font-bold">
                7D
              </TabsTrigger>
              <TabsTrigger
                value="30d"
                className="data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700 rounded-lg font-bold">
                30D
              </TabsTrigger>
              <TabsTrigger
                value="month"
                className="data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700 rounded-lg font-bold">
                Month
              </TabsTrigger>
              <TabsTrigger
                value="year"
                className="data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700 rounded-lg font-bold">
                Year
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={`bg-white shadow-sm rounded-xl font-bold border-slate-200 ${activeTab === "custom" ? "border-emerald-500 text-emerald-700 bg-emerald-50" : "text-slate-600"}`}>
                <CalendarIcon className="mr-2 h-4 w-4" /> Custom Range
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 rounded-2xl" align="end">
              <Calendar
                mode="range"
                selected={{ from: dateRange.from, to: dateRange.to }}
                onSelect={(r) => {
                  if (r?.from) {
                    setDateRange({ from: r.from, to: r.to || r.from });
                    setActiveTab("custom");
                  }
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <Button
            variant="outline"
            className="bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 transition-colors rounded-xl font-bold border-0"
            onClick={handleExport}>
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Export Excel
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={() => refetch()}
            disabled={isRefetching}
            className="bg-white shadow-sm rounded-xl border-slate-200">
            <RefreshCcw
              className={`h-4 w-4 text-slate-600 ${isRefetching ? "animate-spin text-emerald-600" : ""}`}
            />
          </Button>
        </div>
      </div>

      {/* --- 1. TIER 1: FINANCIAL & SAAS KPIs --- */}
      <div>
        <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
          <Wallet className="h-4 w-4 text-emerald-600" /> Platform Economics &
          Health
        </h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Total Recharges (Inflow)"
            value={formatCurrency(safeData.kpi.revenue)}
            trend="Active Period"
            trendUp={true}
            icon={DollarSign}
            color="text-emerald-600"
          />
          <MetricCard
            title="Platform Burn (Usage)"
            value={formatCurrency(safeData.kpi.consumed)}
            trend="Active Period"
            trendUp={true}
            icon={Activity}
            color="text-blue-600"
          />
          <MetricCard
            title="Active Labs"
            value={safeData.kpi.activeLabs}
            trend="Total Live"
            trendUp={true}
            icon={Building2}
            color="text-indigo-600"
          />
          <MetricCard
            title="Low Balance Labs"
            value={safeData.kpi.lowBalanceLabs}
            trend="Requires Top-Up"
            trendUp={false}
            icon={AlertTriangle}
            color="text-rose-600"
          />
        </div>
      </div>

      {/* --- 2. TIER 2: OPERATIONAL & MEDICAL KPIs --- */}
      <div>
        <h3 className="text-sm font-bold text-slate-800 mb-3 mt-2 flex items-center gap-2">
          <Activity className="h-4 w-4 text-purple-500" /> Clinical Volume
        </h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Total Tests Processed"
            value={safeData.kpi.tests.toLocaleString()}
            trend="Active Period"
            trendUp={true}
            icon={TestTube}
            color="text-purple-600"
          />
          <MetricCard
            title="Total Patients"
            value={safeData.kpi.patients.toLocaleString()}
            trend="Active Period"
            trendUp={true}
            icon={Users}
            color="text-pink-600"
          />
          <MetricCard
            title="Avg. Turnaround (TAT)"
            value={safeData.kpi.avgTat}
            trend="Approval Speed"
            trendUp={true}
            icon={Clock}
            color="text-cyan-600"
          />
          <MetricCard
            title="Sample Rejection Rate"
            value={safeData.kpi.rejectionRate}
            trend="Quality Metric"
            trendUp={false}
            icon={AlertTriangle}
            color="text-amber-500"
          />
        </div>
      </div>

      {/* --- 3. NEW ADDITION: EPIDEMIOLOGICAL & DISEASE TREND SURVEILLANCE --- */}
      <motion.div variants={itemVar}>
        <Card className="shadow-sm border-rose-200 bg-gradient-to-br from-white via-white to-rose-50/30 rounded-2xl overflow-hidden">
          <CardHeader className="border-b border-slate-100 pb-4 bg-slate-50/50">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <CardTitle className="text-lg flex items-center gap-2 text-slate-900">
                  <ShieldAlert className="h-5 w-5 text-rose-600" /> Epidemiological & Disease Trend Surveillance
                </CardTitle>
                <CardDescription>
                  Real-time aggregated diagnostic positivity spikes tracked across all workspace laboratory nodes
                </CardDescription>
              </div>
              <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 font-bold w-fit">
                <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping mr-1.5" /> Public Health Feed Active
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {safeData.charts.diseaseTrends.map((disease: any, idx: number) => (
                <div key={idx} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between relative overflow-hidden group hover:border-rose-300 transition-all">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-rose-500" />
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{disease.region}</span>
                      <span className="inline-flex items-center text-xs font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">
                        <Flame className="w-3 h-3 mr-1" /> {disease.spike}
                      </span>
                    </div>
                    <h4 className="text-base font-extrabold text-slate-900">{disease.name}</h4>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-end justify-between">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Confirmed Positives</p>
                      <p className="text-2xl font-black text-slate-900 mt-0.5">{disease.positives}</p>
                    </div>
                    <Badge variant="secondary" className="bg-slate-100 text-slate-700 text-xs font-bold">
                      Surging
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* --- 4. MASTER REVENUE CHART --- */}
      <motion.div variants={itemVar}>
        <Card className="shadow-sm border-slate-200 rounded-2xl overflow-hidden bg-white">
          <CardHeader className="pb-4 bg-slate-50/50 border-b border-slate-100">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-500" /> Revenue
              Velocity
            </CardTitle>
            <CardDescription>
              Daily wallet top-ups generated over the selected timeframe
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[350px] p-6">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={safeData.charts.revenueOverTime}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
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
                  fontSize={12}
                  stroke="#64748b"
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  fontSize={12}
                  stroke="#64748b"
                  tickFormatter={(v) => `₹${v / 1000}k`}
                  dx={-10}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: "16px",
                    border: "none",
                    boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                  }}
                  formatter={(val) => formatCurrency(val as number)}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#10b981"
                  strokeWidth={3}
                  fill="url(#colorRev)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </motion.div>

      {/* --- 5. SAAS SPLIT --- */}
      <div className="grid gap-6 lg:grid-cols-2">
        <motion.div variants={itemVar}>
          <Card className="shadow-sm border-slate-200 h-full rounded-2xl bg-white overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100">
              <CardTitle className="text-base flex items-center gap-2">
                <PieChartIcon className="h-4 w-4 text-emerald-500" /> Revenue by
                Top Contributing Labs
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[300px] p-6">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={safeData.charts.revenueByTopLabs}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value">
                    {safeData.charts.revenueByTopLabs.map(
                      (_: any, i: number) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ),
                    )}
                  </Pie>
                  <Tooltip
                    formatter={(val) => formatCurrency(val as number)}
                    contentStyle={{
                      borderRadius: "12px",
                      border: "none",
                      boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                    }}
                  />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVar}>
          <Card className="shadow-sm border-slate-200 h-full rounded-2xl bg-white overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100">
              <CardTitle className="text-base">
                Labs by Region (State)
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[300px] p-6">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={safeData.charts.geoData}
                  layout="vertical"
                  margin={{ left: 20, right: 30 }}>
                  <XAxis type="number" hide />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={100}
                    fontSize={12}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: "#f1f5f9" }}
                    contentStyle={{
                      borderRadius: "12px",
                      border: "none",
                      boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                    }}
                  />
                  <Bar
                    dataKey="value"
                    fill="#3b82f6"
                    radius={[0, 4, 4, 0]}
                    barSize={24}>
                    {safeData.charts.geoData.map((_: any, index: number) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[(index + 1) % COLORS.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* --- 6. MEDICAL ANALYTICS (Tests & Demographics) --- */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Most Popular Tests */}
        <motion.div variants={itemVar} className="lg:col-span-2">
          <Card className="shadow-sm border-slate-200 h-full rounded-2xl bg-white overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100">
              <CardTitle className="text-base">Top 10 Executed Tests</CardTitle>
              <CardDescription>
                Volume of tests processed globally across all tenants
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[300px] p-6">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={safeData.charts.popularTests}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#e2e8f0"
                  />
                  <XAxis
                    dataKey="name"
                    fontSize={11}
                    axisLine={false}
                    tickLine={false}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis axisLine={false} tickLine={false} fontSize={11} />
                  <Tooltip
                    cursor={{ fill: "#f1f5f9" }}
                    contentStyle={{
                      borderRadius: "12px",
                      border: "none",
                      boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                    }}
                  />
                  <Bar
                    dataKey="value"
                    fill="#ec4899"
                    radius={[4, 4, 0, 0]}
                    barSize={32}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Patient Age Demographics */}
        <motion.div variants={itemVar}>
          <Card className="shadow-sm border-slate-200 h-full rounded-2xl bg-white overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100">
              <CardTitle className="text-base">Patient Age Groups</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px] p-6">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={safeData.charts.demographics.age}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#e2e8f0"
                  />
                  <XAxis
                    dataKey="name"
                    fontSize={12}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: "#f1f5f9" }}
                    contentStyle={{
                      borderRadius: "12px",
                      border: "none",
                      boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                    }}
                  />
                  <Bar
                    dataKey="value"
                    fill="#06b6d4"
                    radius={[4, 4, 0, 0]}
                    barSize={40}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* --- 7. TOP PERFORMERS TABLE --- */}
      <motion.div variants={itemVar}>
        <Card className="shadow-sm border-slate-200 rounded-2xl bg-white overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100">
            <CardTitle>Top Performing Labs (Selected Period)</CardTitle>
            <CardDescription>
              Ranked by revenue generation via Wallet Recharges
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500 font-bold border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4">Rank</th>
                    <th className="px-6 py-4">Lab Name</th>
                    <th className="px-6 py-4">Location</th>
                    <th className="px-6 py-4 text-right">Tests Processed</th>
                    <th className="px-6 py-4 text-right">Revenue Generated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {safeData.topPerformers.map((lab: any, index: number) => (
                    <tr
                      key={index}
                      className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-black text-slate-400">
                        #{index + 1}
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-800">
                        {lab.name}
                      </td>
                      <td className="px-6 py-4 text-slate-500 font-medium">
                        {lab.location}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Badge
                          variant="outline"
                          className="bg-white border-slate-200 font-bold">
                          {lab.tests.toLocaleString()}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-right font-black text-emerald-600">
                        {formatCurrency(lab.revenue)}
                      </td>
                    </tr>
                  ))}
                  {safeData.topPerformers.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-6 py-12 text-center text-slate-500 font-medium">
                        No financial data available for this period.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}

// --- SUB-COMPONENTS ---
function MetricCard({
  title,
  value,
  trend,
  trendUp,
  icon: Icon,
  color,
  subText,
}: any) {
  return (
    <motion.div variants={itemVar}>
      <Card className="hover:shadow-md transition-shadow bg-white border-slate-200 rounded-2xl">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500">
            {title}
          </CardTitle>
          <div
            className={`p-2 rounded-xl bg-opacity-10 ${color.replace("text-", "bg-")}`}>
            <Icon className={`h-4 w-4 ${color}`} />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            {value}
          </div>
          <div className="flex items-center mt-2 text-xs">
            <span
              className={`flex items-center font-bold ${trendUp ? "text-emerald-600" : "text-rose-600"}`}>
              {trendUp ? (
                <TrendingUp className="h-3 w-3 mr-1" />
              ) : (
                <TrendingDown className="h-3 w-3 mr-1" />
              )}
              {trend}
            </span>
            <span className="text-slate-400 ml-1.5 font-medium">
              {subText || "in period"}
            </span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function AnalyticsSkeleton() {
  return (
    <div className="p-8 space-y-8 bg-slate-50 min-h-screen">
      <div className="flex justify-between items-center pb-6 border-b border-slate-200">
        <Skeleton className="h-10 w-64 bg-slate-200 rounded-xl" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-24 bg-slate-200 rounded-xl" />
          <Skeleton className="h-10 w-24 bg-slate-200 rounded-xl" />
          <Skeleton className="h-10 w-24 bg-slate-200 rounded-xl" />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <Skeleton key={i} className="h-32 rounded-2xl bg-slate-200" />
        ))}
      </div>
      <Skeleton className="w-full h-[400px] rounded-2xl bg-slate-200" />
    </div>
  );
}
