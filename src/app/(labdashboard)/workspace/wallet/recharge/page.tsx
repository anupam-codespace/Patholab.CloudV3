"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Wallet,
  ShieldCheck,
  CreditCard,
  CheckCircle2,
} from "lucide-react";
import toast from "react-hot-toast";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const QUICK_AMOUNTS = [500, 1000, 2000, 5000];

export default function RechargePage() {
  const router = useRouter();
  const [baseAmount, setBaseAmount] = useState<string>("1000");
  const [isProcessing, setIsProcessing] = useState(false);

  // Dynamically load Razorpay SDK
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);
  }, []);

  const { data: walletData, isLoading } = useQuery({
    queryKey: ["lab-wallet-details"],
    queryFn: async () => {
      const res = await fetch("/api/workspace/wallet/details");
      if (!res.ok) throw new Error("Failed to load wallet details");
      return res.json();
    },
  });

  const numericBase = parseFloat(baseAmount) || 0;
  const minimumRecharge = walletData?.minimumRecharge || 100;
  const isAmountValid = numericBase >= minimumRecharge;

  // Real-time GST Calculations
  const gstAmount = numericBase * 0.18;
  const totalAmount = numericBase + gstAmount;

  const handleRecharge = async () => {
    if (!isAmountValid) {
      toast.error(`Minimum recharge amount is ₹${minimumRecharge}`);
      return;
    }

    setIsProcessing(true);

    try {
      // 1. Create Order on Backend
      const orderRes = await fetch("/api/workspace/wallet/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ baseAmount: numericBase }),
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok) throw new Error(orderData.error);

      // 2. Open Razorpay Checkout Modal
      const options = {
        key: orderData.keyId,
        amount: orderData.totalAmount * 100, // paise
        currency: orderData.currency,
        name: "Patholab Cloud",
        description: "Wallet Recharge",
        order_id: orderData.orderId,
        handler: async function (response: any) {
          // 3. Verify Payment on Backend
          const verifyRes = await fetch(
            "/api/workspace/wallet/verify-payment",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                baseAmount: numericBase,
              }),
            },
          );

          if (verifyRes.ok) {
            toast.success(`Successfully added ₹${numericBase} to your wallet!`);
            router.push("/workspace/wallet");
          } else {
            toast.error("Payment verification failed. Contact support.");
          }
        },
        prefill: {
          name: walletData?.labName || "Lab Admin",
        },
        theme: {
          color: "#4f46e5", // Indigo-600
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on("payment.failed", function (response: any) {
        toast.error(response.error.description || "Payment failed");
        setIsProcessing(false);
      });

      rzp.open();
    } catch (error: any) {
      toast.error(error.message || "Failed to initialize payment gateway");
    } finally {
      setIsProcessing(false); // Enable button if modal closes
    }
  };

  if (isLoading) {
    return (
      <div className="p-10 text-center text-slate-500 animate-pulse">
        Loading secure checkout...
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6 animate-in fade-in zoom-in-95 duration-500">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
          className="rounded-full hover:bg-slate-100">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900">
            Recharge Wallet
          </h1>
          <p className="text-slate-500 text-sm">
            Add usable credits. GST is billed separately at checkout.
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-5 gap-6">
        <Card className="md:col-span-3 border-slate-200 shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="bg-slate-50 border-b border-slate-100 pb-6">
            <CardTitle className="flex items-center gap-2 text-lg text-slate-800">
              <Wallet className="h-5 w-5 text-indigo-600" /> Usable Credits
              Amount
            </CardTitle>
            <CardDescription>
              Your required minimum recharge is ₹{minimumRecharge}.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-slate-400">
                  ₹
                </span>
                <Input
                  type="number"
                  value={baseAmount}
                  onChange={(e) => setBaseAmount(e.target.value)}
                  className="pl-10 text-3xl font-black h-16 rounded-xl border-slate-300 focus-visible:ring-indigo-600 text-slate-900"
                  placeholder="0.00"
                />
              </div>
              {!isAmountValid && numericBase > 0 && (
                <p className="text-red-500 text-xs font-semibold mt-2 animate-in slide-in-from-top-1">
                  Amount must be at least ₹{minimumRecharge}
                </p>
              )}
            </div>

            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                Quick Select
              </p>
              <div className="flex flex-wrap gap-3">
                {QUICK_AMOUNTS.map((val) => (
                  <button
                    key={val}
                    onClick={() => setBaseAmount(val.toString())}
                    className={`px-4 py-2 rounded-lg text-sm font-bold border transition-all ${
                      numericBase === val
                        ? "bg-indigo-50 border-indigo-600 text-indigo-700 ring-1 ring-indigo-600"
                        : "bg-white border-slate-200 text-slate-600 hover:border-indigo-300 hover:bg-slate-50"
                    }`}>
                    + ₹{val}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* GST & Total Summary Sidebar */}
        <div className="md:col-span-2 space-y-4">
          <Card className="border-0 shadow-lg bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-2xl">
            <CardContent className="p-6 flex flex-col justify-between h-full space-y-6">
              <div className="space-y-4 border-b border-white/10 pb-4">
                <div className="flex justify-between items-center text-slate-300 text-sm">
                  <span>Wallet Credits</span>
                  <span className="font-semibold text-white">
                    ₹{numericBase.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-300 text-sm">
                  <span>GST (18%)</span>
                  <span className="font-semibold text-white">
                    + ₹{gstAmount.toFixed(2)}
                  </span>
                </div>
              </div>

              <div>
                <p className="text-indigo-300 text-xs font-semibold uppercase tracking-wider mb-1">
                  Total to Pay
                </p>
                <div className="text-4xl font-black tracking-tighter text-emerald-400">
                  ₹{totalAmount.toFixed(2)}
                </div>
              </div>

              <div className="space-y-3 pb-2">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
                  <p className="text-sm text-slate-300">
                    Extends wallet validity by 1 Year
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
                  <p className="text-sm text-slate-300">
                    GST Invoice sent to registered email
                  </p>
                </div>
              </div>

              <Button
                onClick={handleRecharge}
                disabled={!isAmountValid || isProcessing}
                className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-bold h-12 rounded-xl text-md shadow-lg shadow-indigo-900/50">
                {isProcessing
                  ? "Processing Securely..."
                  : `Pay ₹${totalAmount.toFixed(2)}`}
              </Button>
            </CardContent>
          </Card>

          <div className="flex items-center justify-center gap-2 text-xs font-medium text-slate-400 mt-4">
            <ShieldCheck className="h-4 w-4" /> SSL Secured by Razorpay
          </div>
        </div>
      </div>
    </div>
  );
}
