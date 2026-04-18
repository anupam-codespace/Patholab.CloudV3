"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  Loader2,
  Check,
  ArrowRight,
  Activity,
  LogOut,
  ShieldCheck,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// --- HELPERS ---

const formatCurrency = (val: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(val);

const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

// ✅ FIX: Safe JSON Parser
const getFeatures = (features: any): string[] => {
  if (!features) return [];
  // If Prisma returns it as an array (expected), return as is
  if (Array.isArray(features)) return features;
  // If it's a string, try to parse it
  if (typeof features === "string") {
    try {
      return JSON.parse(features);
    } catch (e) {
      console.error("Failed to parse plan features", e);
      return [];
    }
  }
  return [];
};

export default function UpgradePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [plans, setPlans] = useState<any[]>([]);
  const [isYearly, setIsYearly] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);

  // 1. Fetch Plans
  useEffect(() => {
    async function fetchPlans() {
      try {
        const res = await fetch("/api/landing");
        const data = await res.json();
        // Filter out plans with price 0 (Free Trial)
        const paidPlans = (data.plans || []).filter((p: any) => p.price > 0);
        setPlans(paidPlans);
      } catch (error) {
        toast.error("Failed to load plans");
      }
    }
    fetchPlans();
  }, []);

  // 2. Handle Payment
  const handleUpgrade = async () => {
    if (!selectedPlan) return;
    setLoading(true);

    try {
      await loadRazorpayScript();

      const orderRes = await fetch("/api/payment/create-upgrade-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: selectedPlan.id }),
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok) throw new Error(orderData.error);

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        order_id: orderData.razorpayOrderId,
        name: "Patholab",
        description: `Upgrade to ${selectedPlan.displayName}`,
        handler: async function (response: any) {
          const verifyRes = await fetch("/api/payment/verify-upgrade", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...response,
              planId: selectedPlan.id,
            }),
          });

          if (verifyRes.ok) {
            toast.success("Upgrade Successful! Redirecting...");
            router.push("/workspace/dashboard");
            router.refresh();
          } else {
            toast.error("Payment verification failed");
          }
        },
        theme: { color: "#2563eb" },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (error: any) {
      toast.error(error.message || "Payment failed");
    } finally {
      setLoading(false);
    }
  };

  // 3. Handle Logout
  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch (e) {
      router.push("/login");
    }
  };

  const displayPlans = plans.filter((p) =>
    isYearly ? p.billingCycle === "YEARLY" : p.billingCycle === "MONTHLY",
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      {/* === TOP BAR === */}
      <div className="w-full flex justify-between items-center p-6 px-8 z-20">
        {/* Brand */}
        <div className="flex items-center gap-2 font-bold text-xl text-slate-900 tracking-tight select-none">
          <div className="bg-gradient-to-br from-blue-600 to-violet-600 p-2 rounded-xl shadow-lg shadow-blue-500/20 text-white">
            <Activity className="h-5 w-5" />
          </div>
          <span>
            Globiz<span className="text-blue-600">Patholab</span>
          </span>
        </div>

        {/* Logout */}
        <Button
          variant="ghost"
          onClick={handleLogout}
          className="text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors">
          <LogOut className="h-4 w-4 mr-2" /> Logout
        </Button>
      </div>

      {/* === MAIN CONTENT === */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 z-10 pb-20">
        <div className="max-w-5xl w-full">
          <div className="text-center mb-10 space-y-4">
            <div className="inline-flex items-center justify-center p-3 bg-white rounded-full shadow-sm mb-2">
              <ShieldCheck className="h-8 w-8 text-blue-600" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900">
              Upgrade Your Plan
            </h1>
            <p className="text-slate-500 max-w-lg mx-auto">
              Your current plan has expired. Please select a plan below to
              continue accessing your lab dashboard and data.
            </p>

            {/* Billing Toggle */}
            <div className="flex items-center justify-center gap-3 bg-white w-fit mx-auto p-1 rounded-full border shadow-sm mt-6">
              <button
                onClick={() => setIsYearly(false)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${!isYearly ? "bg-slate-900 text-white shadow" : "text-slate-500 hover:text-slate-900"}`}>
                Monthly
              </button>
              <button
                onClick={() => setIsYearly(true)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${isYearly ? "bg-slate-900 text-white shadow" : "text-slate-500 hover:text-slate-900"}`}>
                Yearly (-20%)
              </button>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {displayPlans.map((plan) => (
              <Card
                key={plan.id}
                onClick={() => setSelectedPlan(plan)}
                className={`cursor-pointer transition-all hover:shadow-xl border-2 ${selectedPlan?.id === plan.id ? "border-blue-600 ring-4 ring-blue-50 scale-105 z-10" : "border-transparent bg-white/80"}`}>
                <CardContent className="p-6">
                  {plan.isPopular && (
                    <Badge className="mb-3 bg-blue-100 text-blue-700 hover:bg-blue-100 border-0">
                      Most Popular
                    </Badge>
                  )}
                  <h3 className="font-bold text-lg text-slate-900">
                    {plan.displayName}
                  </h3>
                  <div className="text-3xl font-bold text-slate-900 my-2">
                    {formatCurrency(plan.price)}
                    <span className="text-sm font-normal text-slate-500">
                      /mo
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 mb-6 line-clamp-2">
                    {plan.description}
                  </p>

                  <ul className="space-y-3 mb-6">
                    {/* ✅ FIX APPLIED HERE: Using getFeatures helper */}
                    {getFeatures(plan.features)
                      .slice(0, 4)
                      .map((feature: string, i: number) => (
                        <li
                          key={i}
                          className="flex gap-2 text-sm text-slate-600">
                          <Check className="h-4 w-4 text-green-500 shrink-0" />{" "}
                          {feature}
                        </li>
                      ))}
                  </ul>

                  <Button
                    className={`w-full ${selectedPlan?.id === plan.id ? "bg-blue-600 hover:bg-blue-700" : "bg-slate-900 hover:bg-slate-800"}`}>
                    {selectedPlan?.id === plan.id ? "Selected" : "Choose Plan"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {selectedPlan && (
            <div className="mt-12 text-center animate-in slide-in-from-bottom-4 fade-in duration-500">
              <Button
                size="lg"
                className="h-14 px-8 text-lg bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 shadow-xl shadow-blue-500/20 transform hover:scale-[1.02] transition-all"
                onClick={handleUpgrade}
                disabled={loading}>
                {loading ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <>
                    Pay{" "}
                    {formatCurrency(
                      selectedPlan.price + selectedPlan.price * 0.18,
                    )}{" "}
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </>
                )}
              </Button>
              <p className="text-xs text-slate-400 mt-3 flex items-center justify-center gap-1">
                <ShieldCheck className="h-3 w-3" /> Secure payment via Razorpay
                • Includes 18% GST
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
