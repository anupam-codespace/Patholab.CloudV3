"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Building2,
  Users,
  TestTube,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Download,
  Mail,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import toast from "react-hot-toast";

// Animation Variants
const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const item = {
  hidden: { y: 20, opacity: 0 },
  show: { y: 0, opacity: 1 },
};

export default function AdminDashboard() {
  const [isInviteOpen, setIsInviteOpen] = useState(false);

  // Fetch Real Data
  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: async () => {
      const res = await fetch("/api/admin/dashboard");
      if (!res.ok) throw new Error("Network error");
      return res.json();
    },
  });

  // FUNCTION: Download CSV Report
  const handleDownloadReport = () => {
    if (!data?.recentLabs) return;

    // 1. Create CSV Header
    const headers = ["Lab Name", "Owner Email", "Status", "Joined Date"];

    // 2. Map Data to Rows
    const rows = data.recentLabs.map((lab: any) => [
      lab.name,
      lab.email, // Mapped from 'owner' field in API
      "Active", // Assuming status for now
      new Date(lab.joined).toLocaleDateString(),
    ]);

    // 3. Combine into CSV String
    const csvContent = [
      headers.join(","),
      ...rows.map((row: any[]) => row.join(",")),
    ].join("\n");

    // 4. Trigger Download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `globpathology_report_${new Date().toISOString().split("T")[0]}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Report downloaded successfully");
  };

  if (isLoading) return <DashboardSkeleton />;

  if (isError || !data) {
    return (
      <div className="flex h-[50vh] items-center justify-center text-red-500">
        Failed to load dashboard. Please refresh.
      </div>
    );
  }

  // Safe Destructuring
  const {
    stats = {
      totalRevenue: 0,
      revenueTrend: "+0%",
      revenueTrendUp: true,
      activeLabs: 0,
      labsTrend: "+0%",
      totalTests: 0,
      testsTrend: "+0%",
      totalUsers: 0,
      usersTrend: "+0%",
    },
    revenueData = [],
    recentLabs = [],
  } = data;

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-8 p-8 bg-muted/10 min-h-screen">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">
            Dashboard Overview
          </h2>
          <p className="text-slate-500 mt-1">
            Welcome back, Super Admin. Here's what's happening today.
          </p>
        </div>
        <div className="flex gap-2">
          {/* Download Button */}
          <Button
            variant="outline"
            onClick={handleDownloadReport}
            className="bg-white">
            <Download className="mr-2 h-4 w-4" />
            Download Report
          </Button>

          {/* Invite Dialog Component */}
          <InviteLabDialog open={isInviteOpen} onOpenChange={setIsInviteOpen} />
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Revenue"
          value={`₹${stats.totalRevenue?.toLocaleString() || 0}`}
          trend={stats.revenueTrend || "+12%"}
          trendUp={true}
          icon={DollarSign}
          color="text-green-600"
          bg="bg-green-50 border-green-100"
        />
        <StatsCard
          title="Active Labs"
          value={stats.activeLabs || 0}
          subValue={`of ${stats.totalLabs || 0} total`}
          trend={stats.labsTrend || "+5%"}
          trendUp={true}
          icon={Building2}
          color="text-blue-600"
          bg="bg-blue-50 border-blue-100"
        />
        <StatsCard
          title="Total Tests"
          value={stats.totalTests?.toLocaleString() || 0}
          trend={stats.testsTrend || "+8%"}
          trendUp={true}
          icon={TestTube}
          color="text-purple-600"
          bg="bg-purple-50 border-purple-100"
        />
        <StatsCard
          title="Total Users"
          value={stats.totalUsers?.toLocaleString() || 0}
          trend={stats.usersTrend || "+3%"}
          trendUp={true}
          icon={Users}
          color="text-orange-600"
          bg="bg-orange-50 border-orange-100"
        />
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        {/* Revenue Area Chart */}
        <motion.div variants={item} className="col-span-4">
          <Card className="h-full shadow-sm border-slate-200">
            <CardHeader>
              <CardTitle>Revenue Overview</CardTitle>
              <CardDescription>
                Monthly revenue across all subscriptions
              </CardDescription>
            </CardHeader>
            <CardContent className="pl-2">
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueData}>
                    <defs>
                      <linearGradient
                        id="colorRevenue"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1">
                        <stop
                          offset="5%"
                          stopColor="#2563eb"
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor="#2563eb"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="stroke-slate-100"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="date"
                      className="text-xs text-slate-400"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={10}
                    />
                    <YAxis
                      className="text-xs text-slate-400"
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => `₹${value}`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#fff",
                        borderRadius: "8px",
                        border: "1px solid #e2e8f0",
                        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#2563eb"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorRevenue)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Labs List */}
        <motion.div variants={item} className="col-span-3">
          <Card className="h-full flex flex-col shadow-sm border-slate-200">
            <CardHeader>
              <CardTitle>Recent Registrations</CardTitle>
              <CardDescription>New labs onboarded this month</CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              <div className="space-y-6">
                {recentLabs.map((lab: any, i: number) => (
                  <div
                    key={i}
                    className="flex items-center justify-between group">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-bold">
                        {lab.name.charAt(0)}
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium leading-none group-hover:text-blue-600 transition-colors">
                          {lab.name}
                        </p>
                        <p className="text-xs text-slate-500">{lab.email}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge
                        variant="secondary"
                        className="font-normal text-xs bg-green-50 text-green-700 hover:bg-green-100">
                        Active
                      </Badge>
                      <p className="text-[10px] text-slate-400 mt-1">
                        {new Date(lab.joined).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
                {recentLabs.length === 0 && (
                  <div className="text-center text-slate-400 py-10">
                    No recent labs found.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}

// --------------------------------------------------------
// SUB-COMPONENT: Invite Lab Dialog
// --------------------------------------------------------
function InviteLabDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("ownerName"),
      email: formData.get("email"),
      labName: formData.get("labName"),
    };

    try {
      const res = await fetch("/api/admin/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        toast.success("Invitation sent successfully!");
        onOpenChange(false); // Close modal
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to send invite");
      }
    } catch (error) {
      toast.error("Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Mail className="mr-2 h-4 w-4" />
          Invite Lab
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Invite New Laboratory</DialogTitle>
          <DialogDescription>
            Send an email invitation to a lab owner to join GlobPathology.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="labName" className="text-right">
                Lab Name
              </Label>
              <Input
                id="labName"
                name="labName"
                placeholder="e.g. City Path Labs"
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="ownerName" className="text-right">
                Owner Name
              </Label>
              <Input
                id="ownerName"
                name="ownerName"
                placeholder="Dr. Smith"
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">
                Email
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="owner@example.com"
                className="col-span-3"
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Sending..." : "Send Invitation"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// --------------------------------------------------------
// Stats & Skeleton Components
// --------------------------------------------------------
function StatsCard({
  title,
  value,
  subValue,
  trend,
  trendUp,
  icon: Icon,
  color,
  bg,
}: any) {
  return (
    <motion.div variants={item}>
      <Card
        className={`overflow-hidden hover:shadow-lg transition-all duration-300 border shadow-sm ${bg.includes("border") ? "" : "border-slate-200"}`}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-slate-500">
            {title}
          </CardTitle>
          <div className={`p-2 rounded-lg ${bg}`}>
            <Icon className={`h-4 w-4 ${color}`} />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-slate-900">{value}</div>
          <div className="flex items-center text-xs text-muted-foreground mt-1">
            {trendUp ? (
              <ArrowUpRight className="h-3 w-3 text-green-500 mr-1" />
            ) : (
              <ArrowDownRight className="h-3 w-3 text-red-500 mr-1" />
            )}
            <span
              className={
                trendUp
                  ? "text-green-600 font-medium"
                  : "text-red-600 font-medium"
              }>
              {trend}
            </span>
            <span className="ml-1 text-slate-400">vs last month</span>
          </div>
          {subValue && (
            <div className="text-xs text-slate-400 mt-2">{subValue}</div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="p-8 space-y-8 bg-slate-50/50 min-h-screen">
      <div className="flex justify-between items-center">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-7">
        <Skeleton className="col-span-4 h-[400px] rounded-xl" />
        <Skeleton className="col-span-3 h-[400px] rounded-xl" />
      </div>
    </div>
  );
}
