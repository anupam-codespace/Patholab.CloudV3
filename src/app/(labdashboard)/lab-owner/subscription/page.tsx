"use client";

import { useQuery } from "@tanstack/react-query";
import {
  CheckCircle2,
  AlertCircle,
  CreditCard,
  ArrowUpCircle,
  ArrowDownCircle,
  Activity,
  Calendar,
  Zap,
  FileText,
  Database,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

// Helper for currency format
const formatCurrency = (val: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(val);

export default function SubscriptionPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["lab-subscription"],
    queryFn: async () => {
      const res = await fetch("/api/lab-owner/subscription/details");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  if (isLoading) return <SubscriptionSkeleton />;
  if (isError) return <ErrorState />;

  const { currentPlan, usage, availablePlans, payments = [] } = data || {};

  const handleUpgradeClick = () => {
    window.location.href = "/upgrade";
  };

  const viewInvoice = (paymentId: string) => {
    window.open(`/lab-owner/invoice/${paymentId}`, "_blank");
  };

  const getFeatures = (features: any) => {
    try {
      if (Array.isArray(features)) return features;
      if (typeof features === "string") return JSON.parse(features);
      return [];
    } catch {
      return [];
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-10">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-slate-900">
          Subscription & Billing
        </h2>
        <p className="text-slate-500 mt-1">
          Manage your plan, track usage limits, and download invoices.
        </p>
      </div>

      {/* 1. CURRENT PLAN DASHBOARD */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Status Card */}
        <Card className="md:col-span-2 bg-slate-900 text-white border-none shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-blue-600 rounded-full blur-3xl opacity-20 pointer-events-none"></div>

          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-blue-300 text-xs font-bold uppercase tracking-wider mb-1">
                  Current Plan
                </p>
                <CardTitle className="text-3xl font-bold text-white">
                  {currentPlan?.name || "Free Tier"}
                </CardTitle>
              </div>
              <Badge
                variant="outline"
                className={`border-0 px-3 py-1 ${
                  currentPlan?.status === "ACTIVE"
                    ? "bg-green-500/20 text-green-400"
                    : currentPlan?.status === "TRIAL"
                      ? "bg-blue-500/20 text-blue-400"
                      : "bg-red-500/20 text-red-400"
                }`}>
                {currentPlan?.status || "INACTIVE"}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-6 relative z-10">
            <div className="flex flex-col sm:flex-row justify-between items-end gap-4">
              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-white">
                    {formatCurrency(currentPlan?.price || 0)}
                  </span>
                  <span className="text-sm font-medium text-slate-400">
                    /{currentPlan?.billingCycle === "YEARLY" ? "year" : "month"}
                  </span>
                </div>

                <div className="flex items-center gap-4 mt-3 text-sm text-slate-300">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4 text-blue-400" />
                    <span>
                      Renews:{" "}
                      <span className="text-white font-medium">
                        {currentPlan?.endDate
                          ? format(
                              new Date(currentPlan.endDate),
                              "MMM dd, yyyy",
                            )
                          : "N/A"}
                      </span>
                    </span>
                  </div>
                  {currentPlan?.status === "TRIAL" && (
                    <div className="flex items-center gap-1.5">
                      <Activity className="h-4 w-4 text-yellow-400" />
                      <span className="text-yellow-200">Trial Period</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={handleUpgradeClick}
                  className="bg-blue-600 hover:bg-blue-700 text-white border-0 font-semibold shadow-lg shadow-blue-900/20">
                  {currentPlan?.price === 0 ? "Upgrade Now" : "Change Plan"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Usage Stats Card */}
        <Card className="border-slate-200 shadow-sm flex flex-col justify-center">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-600" /> Usage Metrics
            </CardTitle>
            <CardDescription>Resets on next billing cycle</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Tests Usage */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600 font-medium">
                  Monthly Tests
                </span>
                <span className="text-slate-900 font-bold flex items-center gap-2">
                  {usage?.tests || 0}
                  <span className="text-slate-400 font-normal">
                    / {usage?.limitTests === -1 ? "∞" : usage?.limitTests}
                  </span>
                  {/* Show Booster Badge */}
                  {usage?.boosterTests > 0 && (
                    <Badge
                      variant="secondary"
                      className="text-[10px] h-5 px-1 bg-yellow-100 text-yellow-700 hover:bg-yellow-200">
                      <Zap className="h-3 w-3 mr-0.5" /> +{usage.boosterTests}
                    </Badge>
                  )}
                </span>
              </div>
              <Progress
                value={
                  usage?.limitTests === -1
                    ? 15
                    : ((usage?.tests || 0) / (usage?.limitTests || 1)) * 100
                }
                className="h-2 bg-slate-100"
                indicatorClassName={
                  usage?.tests > usage?.limitTests * 0.9
                    ? "bg-red-500"
                    : "bg-blue-600"
                }
              />
            </div>

            {/* Patients Usage */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600 font-medium">
                  Total Patients
                </span>
                <span className="text-slate-900 font-bold">
                  {usage?.patients || 0}{" "}
                  <span className="text-slate-400 font-normal">
                    / {usage?.limitPatients === -1 ? "∞" : usage?.limitPatients}
                  </span>
                </span>
              </div>
              <Progress
                value={
                  usage?.limitPatients === -1
                    ? 10
                    : ((usage?.patients || 0) / (usage?.limitPatients || 1)) *
                      100
                }
                className="h-2 bg-slate-100"
                indicatorClassName="bg-green-600"
              />
            </div>

            {/* Storage Usage (Optional Display) */}
            <div className="flex items-center gap-2 text-xs text-slate-500 mt-2">
              <Database className="h-3 w-3" />
              Storage: {usage?.storageUsed?.toFixed(2) || 0} GB /{" "}
              {usage?.limitStorage?.toFixed(0)} GB
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 2. AVAILABLE PLANS */}
      <div>
        <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <ArrowUpCircle className="h-5 w-5 text-blue-600" /> Available Upgrades
        </h3>
        <div className="grid gap-6 md:grid-cols-3">
          {availablePlans?.map((plan: any) => {
            const isCurrent = currentPlan?.id === plan.id;
            const isUpgrade = plan.price > (currentPlan?.price || 0);
            const features = getFeatures(plan.features);

            return (
              <Card
                key={plan.id}
                className={`relative flex flex-col transition-all duration-200 ${
                  isCurrent
                    ? "border-blue-500 border-2 bg-blue-50/30"
                    : "hover:border-slate-300 hover:shadow-md"
                }`}>
                {isCurrent && (
                  <div className="absolute top-0 right-0 bg-blue-600 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg">
                    CURRENT
                  </div>
                )}

                <CardHeader>
                  <CardTitle className="text-xl">{plan.displayName}</CardTitle>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-slate-900">
                      {formatCurrency(plan.price)}
                    </span>
                    <span className="text-sm text-slate-500 font-medium">
                      /{plan.billingCycle === "YEARLY" ? "yr" : "mo"}
                    </span>
                  </div>
                  <CardDescription className="min-h-[40px] pt-2">
                    {plan.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="flex-1">
                  <div className="space-y-3">
                    {/* Render Features from JSON */}
                    {features.slice(0, 4).map((feature: string, i: number) => (
                      <div
                        key={i}
                        className="flex items-start gap-2.5 text-sm text-slate-600">
                        <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                        <span>{feature}</span>
                      </div>
                    ))}

                    {/* Render Hardware Limits */}
                    <div className="pt-2 border-t border-slate-100 mt-2 space-y-1">
                      <LimitItem
                        label="Monthly Tests"
                        value={plan.maxTestsPerMonth}
                      />
                      <LimitItem
                        label="Patient Records"
                        value={plan.maxPatientsTotal}
                      />
                      <LimitItem label="Staff Accounts" value={plan.maxStaff} />
                    </div>
                  </div>
                </CardContent>

                <CardFooter>
                  <Button
                    className={`w-full ${
                      isCurrent
                        ? "bg-slate-200 text-slate-500 hover:bg-slate-200 cursor-default"
                        : "bg-white border-2 border-slate-200 text-slate-700 hover:border-blue-600 hover:text-blue-600"
                    }`}
                    disabled={isCurrent}
                    onClick={handleUpgradeClick}>
                    {isCurrent
                      ? "Active Plan"
                      : isUpgrade
                        ? "Upgrade Plan"
                        : "Downgrade"}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </div>

      {/* 3. BILLING HISTORY TABLE */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CreditCard className="h-5 w-5 text-slate-500" /> Billing History
          </CardTitle>
          <CardDescription>
            Download tax invoices for your records.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-slate-200 overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 font-medium">Date</th>
                  <th className="px-6 py-4 font-medium">Invoice #</th>
                  <th className="px-6 py-4 font-medium">Description</th>
                  <th className="px-6 py-4 font-medium">Amount</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-12 text-center text-slate-400">
                      No payment history available.
                    </td>
                  </tr>
                ) : (
                  payments.map((payment: any) => (
                    <tr
                      key={payment.id}
                      className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 text-slate-700">
                        {format(new Date(payment.createdAt), "dd MMM yyyy")}
                      </td>
                      <td className="px-6 py-4 font-mono text-xs font-semibold text-blue-600">
                        {payment.invoiceNumber || "PENDING"}
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-800">
                        {/* Logic to show Add-On Name OR Plan Name */}
                        {payment.addOn ? (
                          <span className="flex items-center gap-1.5 text-purple-700">
                            <Zap className="h-3 w-3" /> {payment.addOn.name}
                          </span>
                        ) : (
                          payment.subscription?.plan?.displayName ||
                          (payment.amount === 0
                            ? "Free Trial Activation"
                            : "Plan Subscription")
                        )}
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-900">
                        {formatCurrency(payment.amount)}
                      </td>
                      <td className="px-6 py-4">
                        <Badge
                          variant="outline"
                          className={
                            payment.status === "SUCCESS"
                              ? "text-green-700 bg-green-50 border-green-200 px-2 py-0.5"
                              : "text-red-700 bg-red-50 border-red-200 px-2 py-0.5"
                          }>
                          {payment.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {payment.status === "SUCCESS" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-3 border border-blue-100 hover:border-blue-200"
                            onClick={() => viewInvoice(payment.id)}>
                            <FileText className="h-3.5 w-3.5 mr-2" /> Invoice
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Sub-components for cleaner JSX
function LimitItem({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between text-xs text-slate-500">
      <span>{label}</span>
      <span className="font-medium text-slate-700">
        {value === -1 ? "Unlimited" : value}
      </span>
    </div>
  );
}

function ErrorState() {
  return (
    <div className="p-8 text-center text-red-500 bg-red-50 rounded-lg border border-red-100">
      <AlertCircle className="h-10 w-10 mx-auto mb-2 text-red-600" />
      <h3 className="font-semibold">Unable to load subscription info</h3>
      <p className="text-sm mt-1">Please try refreshing the page.</p>
    </div>
  );
}

function SubscriptionSkeleton() {
  return (
    <div className="space-y-8 max-w-6xl mx-auto p-8">
      <div className="grid gap-6 md:grid-cols-3">
        <Skeleton className="md:col-span-2 h-56 rounded-xl" />
        <Skeleton className="h-56 rounded-xl" />
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-80 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );
}
