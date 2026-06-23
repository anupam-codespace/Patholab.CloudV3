"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import {
  Building2,
  Mail,
  Phone,
  MapPin,
  Calendar,
  CreditCard,
  Users,
  TestTube,
  Lock,
  LogIn,
  AlertTriangle,
  ArrowLeft,
  Wallet,
  Receipt,
  IndianRupee,
  Loader2,
  Save,
  Pencil,
} from "lucide-react";
import { format } from "date-fns";
import {
  AreaChart,
  Area,
  XAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import toast from "react-hot-toast";

// UI Components
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Utils
const formatCurrency = (val: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(val);

export default function LabDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const labId = params.id as string;

  // Local state for editing pricing
  const [perPatientFee, setPerPatientFee] = useState<string>("");
  const [minRecharge, setMinRecharge] = useState<string>("");

  // 1. Fetch Data
  const { data: lab, isLoading } = useQuery({
    queryKey: ["lab-detail", labId],
    queryFn: async () => {
      const res = await fetch(`/api/admin/labs/${labId}`);
      if (!res.ok) throw new Error("Lab not found");
      return res.json();
    },
  });

  // Populate local pricing state once data is loaded
  useEffect(() => {
    if (lab?.wallet) {
      setPerPatientFee(lab.wallet.perPatientFee?.toString() || "2.50");
      setMinRecharge(lab.wallet.minimumRecharge?.toString() || "100");
    }
  }, [lab]);

  // 2. Global Update Mutation (Handles Pricing, Suspend, and Profile Edits)
  const updateSettingsMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch(`/api/admin/labs/${labId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to update settings");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Lab updated successfully");
      queryClient.invalidateQueries({ queryKey: ["lab-detail", labId] });
    },
    onError: () => toast.error("Failed to update settings"),
  });

  if (isLoading) return <DetailPageSkeleton />;
  if (!lab)
    return (
      <div className="p-8 flex justify-center text-slate-500 font-bold">
        Lab not found
      </div>
    );

  const wallet = lab.wallet;
  const isLowBalance = wallet?.balance < 500;

  return (
    <div className="space-y-6 p-4 sm:p-8 min-h-screen bg-slate-50/50">
      {/* --- HEADER --- */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="rounded-xl mt-1">
            <ArrowLeft className="h-5 w-5 text-slate-500" />
          </Button>

          <Avatar className="h-16 w-16 border-2 border-white shadow-sm rounded-2xl">
            <AvatarImage src={lab.logo} className="rounded-2xl object-cover" />
            <AvatarFallback className="text-xl bg-indigo-50 text-indigo-700 font-black rounded-2xl">
              {lab.name.charAt(0)}
            </AvatarFallback>
          </Avatar>

          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black tracking-tight text-slate-900">
                {lab.name}
              </h1>
              <Badge
                variant={lab.isActive ? "default" : "destructive"}
                className={
                  lab.isActive
                    ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                    : ""
                }>
                {lab.isActive ? "Active" : "Suspended"}
              </Badge>
              {wallet && (
                <Badge
                  variant="outline"
                  className={`font-bold ${isLowBalance ? "border-red-200 text-red-700 bg-red-50" : "border-indigo-200 text-indigo-700 bg-indigo-50"}`}>
                  Bal: {formatCurrency(wallet.balance)}
                </Badge>
              )}
            </div>
            <p className="text-slate-500 mt-1 flex items-center gap-2 text-sm font-medium">
              <Building2 className="h-3.5 w-3.5" /> License:{" "}
              {lab.licenseNumber || "N/A"} •
              <MapPin className="h-3.5 w-3.5" /> {lab.city || "No City"},{" "}
              {lab.state || "No State"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* NEW: Edit Profile Button */}
          <EditLabDetailsDialog lab={lab} mutation={updateSettingsMutation} />

          <ResetPasswordDialog userId={lab.ownerId} userName={lab.owner.name} />
          <Button
            variant="outline"
            className="text-indigo-600 border-indigo-200 hover:bg-indigo-50 rounded-xl font-bold">
            <LogIn className="mr-2 h-4 w-4" /> Impersonate
          </Button>
        </div>
      </div>

      {/* --- KPI SUMMARY --- */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Lifetime Top-ups
            </CardTitle>
            <Wallet className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-slate-900">
              {formatCurrency(lab.stats.totalRecharges)}
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Tests Processed
            </CardTitle>
            <TestTube className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-slate-900">
              {lab._count.tests.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Staff
            </CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-slate-900">
              {lab._count.staff}
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Onboarded On
            </CardTitle>
            <Calendar className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-slate-900">
              {format(new Date(lab.createdAt), "MMM yyyy")}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* --- TABS CONTENT --- */}
      <Tabs defaultValue="wallet" className="space-y-6">
        <TabsList className="bg-slate-100 p-1 rounded-xl">
          <TabsTrigger value="wallet" className="rounded-lg font-bold">
            Wallet & Billing
          </TabsTrigger>
          <TabsTrigger value="overview" className="rounded-lg font-bold">
            Overview
          </TabsTrigger>
          <TabsTrigger value="staff" className="rounded-lg font-bold">
            Staff Members
          </TabsTrigger>
          <TabsTrigger
            value="settings"
            className="rounded-lg font-bold text-red-600 data-[state=active]:bg-red-50 data-[state=active]:text-red-700">
            Danger Zone
          </TabsTrigger>
        </TabsList>

        {/* 1. WALLET & BILLING TAB (NEW PAY-AS-YOU-GO DASHBOARD) */}
        <TabsContent value="wallet" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            {/* Wallet Settings / Health */}
            <Card className="rounded-2xl border-slate-200 shadow-sm">
              <CardHeader className="border-b border-slate-100 bg-slate-50/50 rounded-t-2xl">
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-indigo-600" />
                  Wallet Health
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5 pt-6">
                {wallet ? (
                  <>
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase mb-1">
                        Current Balance
                      </p>
                      <p
                        className={`text-3xl font-black ${isLowBalance ? "text-red-600" : "text-emerald-600"}`}>
                        {formatCurrency(wallet.balance)}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-bold text-slate-400 uppercase mb-1">
                          Validity
                        </p>
                        <p className="text-sm font-bold text-slate-900">
                          {wallet.validityEndDate
                            ? format(
                                new Date(wallet.validityEndDate),
                                "dd MMM yyyy",
                              )
                            : "N/A"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-400 uppercase mb-1">
                          Status
                        </p>
                        <Badge
                          variant="outline"
                          className="bg-emerald-50 text-emerald-700 border-emerald-200">
                          Active
                        </Badge>
                      </div>
                    </div>
                    <Separator />

                    {/* PRICING CONFIGURATOR */}
                    <div className="space-y-4 pt-2">
                      <h4 className="text-sm font-bold text-slate-900">
                        Custom Pricing Rules
                      </h4>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <Label className="w-1/2 text-xs text-slate-500">
                            Per Patient Fee (₹)
                          </Label>
                          <Input
                            type="number"
                            value={perPatientFee}
                            onChange={(e) => setPerPatientFee(e.target.value)}
                            className="h-8 text-sm font-bold rounded-lg"
                          />
                        </div>
                        <div className="flex items-center gap-3">
                          <Label className="w-1/2 text-xs text-slate-500">
                            Min Recharge (₹)
                          </Label>
                          <Input
                            type="number"
                            value={minRecharge}
                            onChange={(e) => setMinRecharge(e.target.value)}
                            className="h-8 text-sm font-bold rounded-lg"
                          />
                        </div>
                        <Button
                          size="sm"
                          className="w-full h-8 rounded-lg mt-2"
                          disabled={updateSettingsMutation.isPending}
                          onClick={() =>
                            updateSettingsMutation.mutate({
                              perPatientFee: Number(perPatientFee),
                              minimumRecharge: Number(minRecharge),
                            })
                          }>
                          {updateSettingsMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Save className="h-4 w-4 mr-2" />
                          )}
                          Save Pricing Rules
                        </Button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-sm text-slate-500 font-medium p-4 text-center bg-slate-50 rounded-xl">
                    No wallet provisioned for this lab.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Transaction Ledger */}
            <Card className="col-span-2 rounded-2xl border-slate-200 shadow-sm">
              <CardHeader className="border-b border-slate-100 bg-slate-50/50 rounded-t-2xl flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-slate-500" />
                  Recent Ledger Activity
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs font-bold rounded-lg">
                  View Full Statement
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                {wallet?.transactions?.length > 0 ? (
                  <div className="divide-y divide-slate-100 h-[380px] overflow-y-auto custom-scrollbar">
                    {wallet.transactions.map((txn: any) => (
                      <div
                        key={txn.id}
                        className="flex items-center justify-between p-4 hover:bg-slate-50/50 transition-colors">
                        <div className="flex items-center gap-4">
                          <div
                            className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${
                              txn.type === "RECHARGE"
                                ? "bg-emerald-100 text-emerald-600"
                                : "bg-rose-100 text-rose-600"
                            }`}>
                            {txn.type === "RECHARGE" ? (
                              <ArrowLeft className="h-4 w-4 rotate-90" />
                            ) : (
                              <ArrowLeft className="h-4 w-4 -rotate-90" />
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900 line-clamp-1">
                              {txn.description || txn.type}
                            </p>
                            <p className="text-xs font-medium text-slate-500">
                              {format(
                                new Date(txn.createdAt),
                                "MMM dd, yyyy • hh:mm a",
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="text-right shrink-0 ml-4">
                          <div
                            className={`font-black text-sm ${txn.type === "RECHARGE" ? "text-emerald-600" : "text-slate-900"}`}>
                            {txn.type === "RECHARGE" ? "+" : "-"}
                            {formatCurrency(txn.amount)}
                          </div>
                          <div className="text-[10px] font-bold text-slate-400 mt-0.5">
                            Bal: {formatCurrency(txn.closingBalance)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-slate-500 font-medium">
                    No transactions recorded yet.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 2. OVERVIEW TAB */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            {/* Owner Details Card */}
            <Card className="col-span-3 rounded-2xl border-slate-200 shadow-sm">
              <CardHeader className="border-b border-slate-100 bg-slate-50/50 rounded-t-2xl">
                <CardTitle>Owner Information</CardTitle>
                <CardDescription>
                  Primary contact for this workspace
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12 rounded-xl">
                    <AvatarFallback className="bg-indigo-100 text-indigo-700 font-bold rounded-xl">
                      {lab.owner.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-bold text-slate-900">{lab.owner.name}</p>
                    <p className="text-xs font-medium text-slate-500">
                      Master Admin
                    </p>
                  </div>
                </div>
                <Separator />
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm font-medium text-slate-700">
                    <Mail className="h-4 w-4 text-slate-400" />
                    <span>{lab.owner.email}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm font-medium text-slate-700">
                    <Phone className="h-4 w-4 text-slate-400" />
                    <span>{lab.owner.phone}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recharge Graph */}
            <Card className="col-span-4 rounded-2xl border-slate-200 shadow-sm">
              <CardHeader className="border-b border-slate-100 bg-slate-50/50 rounded-t-2xl">
                <CardTitle>Wallet Top-up Activity</CardTitle>
                <CardDescription>
                  B2B Revenue (recharges) generated by this client
                </CardDescription>
              </CardHeader>
              <CardContent className="pl-2 pt-6">
                <div className="h-[200px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={lab.stats.rechargeGraph}>
                      <defs>
                        <linearGradient
                          id="colorRev"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1">
                          <stop
                            offset="5%"
                            stopColor="#10b981"
                            stopOpacity={0.2}
                          />
                          <stop
                            offset="95%"
                            stopColor="#10b981"
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="#e2e8f0"
                      />
                      <XAxis dataKey="date" hide />
                      <Tooltip
                        contentStyle={{
                          borderRadius: "12px",
                          border: "none",
                          boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                        }}
                        formatter={(value: any) => [
                          `₹${value}`,
                          "Amount Recharged",
                        ]}
                        labelStyle={{
                          fontWeight: "bold",
                          color: "#64748b",
                          marginBottom: "4px",
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="amount"
                        stroke="#10b981"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#colorRev)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 3. STAFF TAB */}
        <TabsContent value="staff">
          <Card className="rounded-2xl border-slate-200 shadow-sm">
            <CardHeader className="border-b border-slate-100 bg-slate-50/50 rounded-t-2xl">
              <CardTitle>Staff Accounts</CardTitle>
              <CardDescription>
                Users utilizing this lab's unlimited seats
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-2">
                {lab.staff.map((member: any) => (
                  <div
                    key={member.userId}
                    className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition-colors border border-transparent hover:border-slate-100">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-10 w-10 rounded-lg">
                        <AvatarImage
                          src={member.user.avatar}
                          className="rounded-lg object-cover"
                        />
                        <AvatarFallback className="rounded-lg bg-slate-100 text-slate-600 font-bold">
                          {member.user.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-bold text-sm text-slate-900">
                          {member.user.name}
                        </p>
                        <p className="text-xs font-medium text-slate-500">
                          {member.user.email}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge
                        variant="secondary"
                        className="bg-slate-100 text-slate-700 hover:bg-slate-100">
                        {member.position}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 4. SETTINGS (DANGER) TAB */}
        <TabsContent value="settings">
          <Card className="border-red-200 bg-red-50/50 rounded-2xl shadow-sm">
            <CardHeader className="border-b border-red-100">
              <CardTitle className="text-red-600 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" /> Danger Zone
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="flex items-center justify-between p-5 bg-white rounded-xl border border-red-100 shadow-sm">
                <div>
                  <p className="font-bold text-slate-900">Suspend Laboratory</p>
                  <p className="text-sm font-medium text-slate-500 mt-1">
                    Blocks all login access and halts their clinical operations
                    immediately.
                  </p>
                </div>
                <Button
                  variant="destructive"
                  className="rounded-xl font-bold"
                  disabled={updateSettingsMutation.isPending}
                  onClick={() =>
                    updateSettingsMutation.mutate({ isActive: !lab.isActive })
                  }>
                  {lab.isActive ? "Suspend Access" : "Restore Access"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// --- SUB-COMPONENTS ---

function EditLabDetailsDialog({ lab, mutation }: { lab: any; mutation: any }) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: lab.name,
    email: lab.email,
    phone: lab.phone,
    address: lab.address || "",
    city: lab.city || "",
    state: lab.state || "",
    licenseNumber: lab.licenseNumber || "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(formData);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="rounded-xl font-bold text-slate-600 border-slate-200">
          <Pencil className="mr-2 h-4 w-4 text-slate-400" /> Edit Details
        </Button>
      </DialogTrigger>
      <DialogContent className="rounded-2xl sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Lab Details</DialogTitle>
          <DialogDescription>
            Update the clinic's public profile and contact information.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1">
            <Label className="text-xs text-slate-500">Lab Name</Label>
            <Input
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="rounded-xl"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs text-slate-500">Email</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                className="rounded-xl"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-500">Phone</Label>
              <Input
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                className="rounded-xl"
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-slate-500">Address</Label>
            <Input
              value={formData.address}
              onChange={(e) =>
                setFormData({ ...formData, address: e.target.value })
              }
              className="rounded-xl"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs text-slate-500">City</Label>
              <Input
                value={formData.city}
                onChange={(e) =>
                  setFormData({ ...formData, city: e.target.value })
                }
                className="rounded-xl"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-500">State</Label>
              <Input
                value={formData.state}
                onChange={(e) =>
                  setFormData({ ...formData, state: e.target.value })
                }
                className="rounded-xl"
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-slate-500">
              License / Registration No.
            </Label>
            <Input
              value={formData.licenseNumber}
              onChange={(e) =>
                setFormData({ ...formData, licenseNumber: e.target.value })
              }
              className="rounded-xl"
            />
          </div>
          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="rounded-xl">
              Cancel
            </Button>
            <Button
              type="submit"
              className="rounded-xl"
              disabled={mutation.isPending}>
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ResetPasswordDialog({
  userId,
  userName,
}: {
  userId: string;
  userName: string;
}) {
  const [open, setOpen] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    toast.loading("Resetting password...");
    // Add real API call to trigger password reset via your Auth provider
    setTimeout(() => {
      toast.dismiss();
      toast.success("Password reset email sent to owner.");
      setOpen(false);
    }, 1000);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="rounded-xl font-bold text-slate-600 border-slate-200">
          <Lock className="mr-2 h-4 w-4 text-slate-400" /> Reset Password
        </Button>
      </DialogTrigger>
      <DialogContent className="rounded-2xl">
        <DialogHeader>
          <DialogTitle>Reset Password for {userName}</DialogTitle>
          <DialogDescription>
            This will invalidate their current session and email them a secure
            reset link.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-4">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            className="rounded-xl">
            Cancel
          </Button>
          <Button onClick={handleReset} className="rounded-xl">
            Confirm Reset
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DetailPageSkeleton() {
  return (
    <div className="p-8 space-y-8 bg-slate-50/50 min-h-screen">
      <div className="flex items-center gap-4">
        <Skeleton className="h-16 w-16 rounded-2xl" />
        <div className="space-y-3">
          <Skeleton className="h-8 w-64 rounded-lg" />
          <Skeleton className="h-4 w-48 rounded-md" />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-32 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-[400px] rounded-2xl" />
    </div>
  );
}
