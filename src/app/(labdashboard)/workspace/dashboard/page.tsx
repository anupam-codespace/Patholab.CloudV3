"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  DollarSign,
  Activity,
  ArrowUpRight,
  Wallet,
  Package,
  MapPin,
  Clock,
  AlertTriangle,
  Users,
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
    maximumFractionDigits: 0,
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

  // 2. ENHANCED FORM SUBMISSION
  const onSetupSubmit = async (formData: any) => {
    try {
      const res = await fetch("/api/labs/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const json = await res.json();

      if (!res.ok) {
        // Throw the explicit server error message so the catch block can render it
        throw new Error(
          json.error || "Failed to process lab setup configuration.",
        );
      }

      toast.success("Lab Setup Complete! Welcome to your new workspace.");
      setShowSetupModal(false);
      refetch(); // Refresh dashboard data immediately
    } catch (e: any) {
      // Safely display the caught error message to the user
      toast.error(
        e.message || "An unexpected error occurred while saving details.",
      );
    }
  };

  if (isLoading) return <DashboardSkeleton />;
  if (isError)
    return (
      <div className="p-10 text-center text-red-500 font-medium">
        Failed to load dashboard data. Please try refreshing.
      </div>
    );

  const { kpi, charts, alerts, recentPatients, labDetails } = data || {};
  const branchName = labDetails?.name || "Main Branch";

  // Wallet Low Balance Alert Threshold
  const isLowBalance = (kpi?.walletBalance || 0) < 100;

  return (
    <div className="space-y-6 p-4 md:p-8 min-h-screen bg-slate-50/50">
      {/* HEADER: Personalized Welcome */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            Dashboard Overview
          </h1>
          <p className="text-sm font-bold text-primary mt-1.5 flex items-center gap-1.5 bg-indigo-50 w-max px-2.5 py-1 rounded-md">
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
              <SelectItem value="MONTH">This Month</SelectItem>
              <SelectItem value="YEAR">This Year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* FINANCIAL & KPI CARDS */}
      <div className="grid gap-4 md:grid-cols-4">
        {/* 1. Wallet Balance Card (NEW PAY-AS-YOU-GO FOCUS) */}
        <Card
          className={`border shadow-sm relative overflow-hidden ${isLowBalance ? "border-red-300 bg-red-50" : "border-indigo-200 bg-indigo-50"}`}>
          <div
            className={`absolute -right-4 -top-4 w-24 h-24 rounded-full opacity-50 ${isLowBalance ? "bg-red-100" : "bg-indigo-100"}`}></div>
          <CardHeader className="pb-2">
            <CardTitle
              className={`text-[11px] font-bold uppercase flex items-center gap-1 ${isLowBalance ? "text-red-700" : "text-primary"}`}>
              <Wallet className="w-3 h-3" /> Wallet Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-3xl font-black ${isLowBalance ? "text-red-900" : "text-indigo-900"}`}>
              {formatCurrency(kpi?.walletBalance || 0)}
            </div>
            <div className="flex items-center justify-between mt-2">
              {isLowBalance && (
                <span className="text-[10px] font-bold text-red-600 flex items-center">
                  <AlertTriangle className="w-3 h-3 mr-1" /> Low Balance
                </span>
              )}
              <Button
                size="sm"
                className={`h-7 text-xs ${isLowBalance ? "bg-red-600 hover:bg-red-700" : "bg-primary hover:bg-primary/90"}`}
                onClick={() => router.push("/workspace/wallet")}>
                Recharge
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 2. Total Revenue */}
        <Card className="border-slate-200 shadow-sm relative overflow-hidden bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1">
              <DollarSign className="w-3 h-3" /> Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-slate-900">
              {formatCurrency(kpi?.revenue || 0)}
            </div>
            <p className="text-xs text-primary mt-1 flex items-center font-semibold">
              <ArrowUpRight className="w-3 h-3 mr-1" /> Collected
            </p>
          </CardContent>
        </Card>

        {/* 3. Total Tests */}
        <Card className="border-slate-200 shadow-sm relative overflow-hidden bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1">
              <Activity className="w-3 h-3" /> Tests Performed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-slate-900">
              {kpi?.totalTests || 0}
            </div>
            <p className="text-xs text-primary mt-1 flex items-center font-semibold">
              In selected period
            </p>
          </CardContent>
        </Card>

        {/* 4. Critical Alerts */}
        <Card
          className="border-orange-200 bg-orange-50/30 shadow-sm relative overflow-hidden cursor-pointer hover:border-orange-300 transition-colors"
          onClick={() => router.push("/workspace/inventory")}>
          <CardHeader className="pb-2">
            <CardTitle className="text-[11px] font-bold text-orange-600 uppercase flex items-center gap-1">
              <Package className="w-3 h-3" /> Inventory Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-orange-700">
              {alerts?.inventory || 0}
            </div>
            <p className="text-xs text-orange-600 mt-1 font-semibold">
              Low stock items
            </p>
          </CardContent>
        </Card>
      </div>

      {/* CHARTS ROW */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Financial Trend Chart */}
        <Card className="shadow-sm border-slate-200 bg-white">
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              Revenue Trend
              <div className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-slate-500">
                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>{" "}
                Revenue
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={charts?.trend || []}>
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
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Test Volume Chart */}
        <Card className="shadow-sm border-slate-200 bg-white">
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              Test Volume Trend
              <div className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-slate-500">
                <div className="w-2 h-2 rounded-full bg-blue-500"></div> Tests
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[280px]">
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
                  fill="#3b82f6"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* RECENT PATIENTS */}
      <Card className="shadow-sm border-slate-200 bg-white w-full">
        <CardHeader className="pb-3 border-b border-slate-100 flex flex-row justify-between items-center bg-slate-50/50">
          <CardTitle className="text-base text-slate-800 flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" /> Recent Patients
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="text-primary hover:bg-indigo-50 font-bold"
            onClick={() => router.push("/workspace/patients")}>
            View All &rarr;
          </Button>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentPatients?.length > 0 ? (
              recentPatients.map((patient: any) => (
                <div
                  key={patient.id}
                  className="flex items-center justify-between group cursor-pointer hover:bg-slate-50 p-3 rounded-xl transition-colors border border-slate-100 hover:border-indigo-200 shadow-sm"
                  onClick={() =>
                    router.push(`/workspace/patients/${patient.id}`)
                  }>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 bg-indigo-50 border border-indigo-100 text-primary font-bold shadow-sm">
                      <AvatarFallback>{patient.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-semibold text-slate-900 group-hover:text-primary transition-colors">
                        {patient.name}
                      </p>
                      <p className="text-[11px] font-medium text-slate-500 mt-0.5">
                        {patient.phone}
                      </p>
                    </div>
                  </div>
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
      <Dialog open={showSetupModal} onOpenChange={setShowSetupModal}>
        <DialogContent
          className="sm:max-w-[425px]"
          onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Set Up Your Laboratory</DialogTitle>
            <DialogDescription>
              Please provide your lab's primary details to activate your
              workspace.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={setupForm.handleSubmit(onSetupSubmit)}
            className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Laboratory Name</Label>
              <Input
                placeholder="e.g. Apex Diagnostics"
                {...setupForm.register("labName")}
              />
              {setupForm.formState.errors.labName && (
                <p className="text-xs text-red-500">
                  {setupForm.formState.errors.labName.message as string}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Clinical License Number</Label>
              <Input
                placeholder="e.g. LIC-2024-XXXX"
                {...setupForm.register("licenseNumber")}
              />
              {setupForm.formState.errors.licenseNumber && (
                <p className="text-xs text-red-500">
                  {setupForm.formState.errors.licenseNumber.message as string}
                </p>
              )}
            </div>
            <DialogFooter className="pt-4">
              <Button
                type="submit"
                disabled={setupForm.formState.isSubmitting}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
                {setupForm.formState.isSubmitting
                  ? "Saving..."
                  : "Complete Setup"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="p-8 space-y-8 min-h-screen bg-slate-50/50 animate-pulse">
      <div className="flex flex-col md:flex-row justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64 rounded-md" />
          <Skeleton className="h-5 w-32 rounded-md" />
        </div>
        <Skeleton className="h-10 w-[180px] rounded-md" />
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-[350px] rounded-xl" />
        <Skeleton className="h-[350px] rounded-xl" />
      </div>
    </div>
  );
}
