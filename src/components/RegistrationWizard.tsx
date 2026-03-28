"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import {
  CheckCircle2,
  Loader2,
  Eye,
  EyeOff,
  XCircle,
  Check,
  Mail,
  ShieldCheck,
  ArrowRight,
  Activity,
  RotateCcw,
  ChevronLeft,
  Edit2,
  Home,
  AlertCircle,
  LogOut,
  Rocket,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// UI Components
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

// --- HELPER: FORMAT CURRENCY ---
const formatCurrency = (val: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(val);

// --- HELPER: LOAD RAZORPAY ---
const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

// --- VALIDATION SCHEMAS ---
const userSchema = z
  .object({
    name: z.string().min(2, "Name is too short"),
    email: z.string().email("Please enter a valid email"),
    phone: z.string().min(10, "Phone must be 10 digits"),
    password: z
      .string()
      .min(8, "Minimum 8 characters")
      .regex(/[A-Za-z]/, "At least one letter")
      .regex(/[0-9]/, "At least one number")
      .regex(/[^A-Za-z0-9]/, "At least one special character"),
    confirmPassword: z.string(),
    otp: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

const labSchema = z.object({
  labName: z.string().min(2, "Lab name is required"),
  licenseNumber: z.string().min(3, "License number is required"),
  gstNumber: z.string().optional(),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone must be 10 digits"),
  address: z.string().min(5, "Address is too short"),
  city: z.string().min(2, "City is required"),
  state: z.string().min(2, "State is required"),
  pincode: z.string().min(6, "Invalid Pincode"),
});

export default function RegistrationWizard() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // --- STATE ---
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Plan State
  const [allPlans, setAllPlans] = useState<any[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [billingCycle, setBillingCycle] = useState(
    searchParams.get("cycle") || "MONTHLY",
  );
  const [isYearly, setIsYearly] = useState(billingCycle === "YEARLY");

  // User Data State
  const [userId, setUserId] = useState<string | null>(null);
  const [labId, setLabId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState("");

  // UI Toggles
  const [showPass, setShowPass] = useState(false);
  const [timer, setTimer] = useState(0);

  // Forms
  const userForm = useForm({
    resolver: zodResolver(userSchema),
    mode: "onChange",
  });
  const labForm = useForm({
    resolver: zodResolver(labSchema),
    mode: "onChange",
  });

  // Password Watcher
  const password = userForm.watch("password") || "";
  const passChecks = {
    length: password.length >= 8,
    letter: /[A-Za-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };

  // --- 1. INITIALIZATION & RESTORE STATE ---
  useEffect(() => {
    async function init() {
      try {
        const res = await fetch(`/api/landing`);
        const data = await res.json();
        setAllPlans(data.plans || []);

        // Restore Progress
        const savedData = localStorage.getItem("registrationState");
        if (savedData) {
          const parsed = JSON.parse(savedData);
          if (parsed.userId) setUserId(parsed.userId);
          if (parsed.userEmail) setUserEmail(parsed.userEmail);
          if (parsed.labId) setLabId(parsed.labId);
          if (parsed.selectedPlan) setSelectedPlan(parsed.selectedPlan);

          if (parsed.step > 1) {
            setStep(parsed.step);
            toast.success("Resumed your registration session");
          }
        } else {
          const urlPlanId = searchParams.get("planId");
          if (urlPlanId && data.plans) {
            const found = data.plans.find((p: any) => p.id === urlPlanId);
            if (found) setSelectedPlan(found);
          }
        }
      } catch (e) {
        console.error(e);
      }
    }
    init();
  }, [searchParams]);

  useEffect(() => {
    setBillingCycle(isYearly ? "YEARLY" : "MONTHLY");
  }, [isYearly]);

  useEffect(() => {
    let interval: any;
    if (timer > 0) interval = setInterval(() => setTimer((t) => t - 1), 1000);
    return () => clearInterval(interval);
  }, [timer]);

  // --- PERSISTENCE ---
  const saveProgress = (newData: any) => {
    const currentData = localStorage.getItem("registrationState")
      ? JSON.parse(localStorage.getItem("registrationState")!)
      : {};
    const updated = { ...currentData, ...newData };
    localStorage.setItem("registrationState", JSON.stringify(updated));
  };

  const clearProgress = () => {
    localStorage.removeItem("registrationState");
  };

  // --- ACTIONS ---
  const selectPlan = (plan: any) => {
    setSelectedPlan(plan);
  };

  const confirmPlan = () => {
    if (selectedPlan) {
      setStep(2);
      saveProgress({ step: 2, selectedPlan });
    }
  };

  // --- API HANDLERS ---
  const onRegister = async (data: any) => {
    setLoading(true);
    try {
      const { confirmPassword, otp, ...payload } = data;
      const res = await fetch("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ ...payload, planId: selectedPlan.id }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);

      setUserId(result.userId);
      setUserEmail(data.email);
      setTimer(60);
      setStep(3);
      saveProgress({ userId: result.userId, userEmail: data.email, step: 3 });
      toast.success(`OTP sent to ${data.email}`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const onVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = new FormData(e.target as HTMLFormElement).get("otp");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        body: JSON.stringify({ userId, code }),
      });
      if (!res.ok) throw new Error("Invalid Code");
      toast.success("Email Verified!");
      setStep(4);
      saveProgress({ step: 4 });
    } catch (err) {
      toast.error("Verification Failed");
    } finally {
      setLoading(false);
    }
  };

  const onLabSubmit = async (data: any) => {
    if (!userId) {
      toast.error("Session expired. Please restart.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/labs/pre-setup", {
        method: "POST",
        body: JSON.stringify({ ...data, userId }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      setLabId(result.labId);
      setStep(5);
      saveProgress({ labId: result.labId, step: 5 });
      toast.success("Lab details saved");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  // ✅ UPDATED: Handles Free Trial & Paid Plans
  const onPayment = async () => {
    if (!selectedPlan || !userId || !labId) return;
    setLoading(true);

    try {
      // 🟢 SCENARIO A: FREE TRIAL (Price is 0)
      if (selectedPlan.price === 0) {
        const res = await fetch("/api/payment/activate-trial", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ planId: selectedPlan.id, userId, labId }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to start trial");

        clearProgress();
        toast.success("Free Trial Activated! 🚀");
        // Redirect to Login to ensure session is fresh, or dashboard if using JWT
        setTimeout(() => router.push("/login"), 2000);
        return;
      }

      // 🔵 SCENARIO B: PAID PLAN (Razorpay)
      await loadRazorpayScript();
      const orderRes = await fetch("/api/payment/create-subscription", {
        method: "POST",
        body: JSON.stringify({ planId: selectedPlan.id, userId, labId }),
      });
      const orderData = await orderRes.json();
      if (!orderRes.ok) throw new Error(orderData.error);

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        subscription_id: orderData.subscriptionId,
        name: "Globiz Patholab",
        description: `Subscribe to ${selectedPlan.displayName}`,
        handler: async function (response: any) {
          const verifyRes = await fetch("/api/payment/verify", {
            method: "POST",
            body: JSON.stringify({
              ...response,
              userId,
              planId: selectedPlan.id,
              labId,
            }),
          });
          if (verifyRes.ok) {
            clearProgress();
            toast.success("Payment Successful! Account Activated.");
            setTimeout(() => router.push("/login"), 2000);
          } else {
            toast.error("Verification Failed");
          }
        },
        theme: { color: "#3b82f6" },
      };
      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const onResendOtp = async () => {
    if (timer > 0) return;
    try {
      await fetch("/api/auth/otp/resend", {
        method: "POST",
        body: JSON.stringify({ userId }),
      });
      toast.success("Code resent");
      setTimer(60);
    } catch (e) {
      toast.error("Failed");
    }
  };

  const resetFlow = () => {
    if (confirm("This will clear your current progress. Start over?")) {
      clearProgress();
      setStep(1);
      setUserId(null);
      setSelectedPlan(null);
    }
  };

  const basePrice = selectedPlan ? selectedPlan.price : 0;
  const gst = basePrice * 0.18;
  const total = basePrice + gst;
  const displayPlans = allPlans.filter((p) => p.billingCycle === billingCycle);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 relative overflow-hidden p-4">
      {/* Background Decor */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>
      <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none animate-pulse"></div>

      <Card
        className={`w-full ${step === 1 && !selectedPlan ? "max-w-5xl" : "max-w-lg"} shadow-2xl border-white/50 backdrop-blur-xl bg-white/90 relative z-10 transition-all duration-500`}>
        {/* === HEADER === */}
        <div className="bg-slate-50/80 p-6 border-b border-slate-100">
          <div className="flex justify-between items-center mb-6">
            <Link
              href="/"
              className="group flex items-center gap-2 font-bold text-xl text-slate-900 tracking-tight cursor-pointer">
              <div className="bg-gradient-to-br from-blue-600 to-violet-600 p-2 rounded-xl shadow-lg shadow-blue-500/20 text-white group-hover:scale-105 transition-transform">
                <Activity className="h-5 w-5" />
              </div>
              <span className="group-hover:text-blue-600 transition-colors">
                Globiz Patholab<span className="text-blue-600"></span>
              </span>
            </Link>

            <div className="flex gap-2">
              {step > 1 && (
                <button
                  onClick={resetFlow}
                  className="text-xs text-red-500 hover:bg-red-50 px-3 py-1 rounded-full flex items-center gap-1 transition-colors">
                  <LogOut className="h-3 w-3" /> Start Over
                </button>
              )}
              <Link
                href="/"
                className="text-slate-400 hover:text-slate-900 transition-colors">
                <Home className="h-5 w-5" />
              </Link>
            </div>
          </div>

          <div className="flex justify-between items-center relative px-4">
            <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-slate-100 -z-10" />
            <StepIcon step={step} num={1} label="Plan" />
            <StepIcon step={step} num={2} label="Account" />
            <StepIcon step={step} num={3} label="Verify" />
            <StepIcon step={step} num={4} label="Setup" />
            <StepIcon step={step} num={5} label="Pay" />
          </div>
        </div>

        <CardContent className="p-8 min-h-[400px]">
          <AnimatePresence mode="wait">
            {/* STEP 1: PLAN */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6">
                {!selectedPlan ? (
                  <>
                    <div className="text-center space-y-4">
                      <h2 className="text-2xl font-bold tracking-tight">
                        Choose Your Plan
                      </h2>
                      <div className="flex items-center justify-center gap-3 bg-slate-100 w-fit mx-auto p-1 rounded-full">
                        <button
                          onClick={() => setIsYearly(false)}
                          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${!isYearly ? "bg-white shadow text-slate-900" : "text-slate-500"}`}>
                          Monthly
                        </button>
                        <button
                          onClick={() => setIsYearly(true)}
                          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${isYearly ? "bg-white shadow text-slate-900" : "text-slate-500"}`}>
                          Yearly (-20%)
                        </button>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-3 gap-6 mt-8">
                      {displayPlans.length > 0 ? (
                        displayPlans.map((plan) => (
                          <div
                            key={plan.id}
                            onClick={() => selectPlan(plan)}
                            className={`relative group cursor-pointer rounded-2xl border-2 p-6 transition-all hover:border-blue-500 hover:shadow-xl ${plan.isPopular ? "border-blue-500 bg-blue-50/30" : "border-slate-100 bg-white"}`}>
                            {plan.isPopular && (
                              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                                Most Popular
                              </div>
                            )}
                            <h3 className="font-bold text-lg text-slate-900 mb-2">
                              {plan.displayName}
                            </h3>
                            <div className="text-3xl font-bold text-slate-900 mb-2">
                              {formatCurrency(plan.price)}
                              <span className="text-sm font-normal text-slate-500">
                                /mo
                              </span>
                            </div>
                            <p className="text-sm text-slate-500 mb-6">
                              {plan.description}
                            </p>
                            <Button
                              className={`w-full ${plan.isPopular ? "bg-blue-600 hover:bg-blue-700" : "bg-slate-900 hover:bg-slate-800"}`}>
                              {plan.price === 0
                                ? "Start Free Trial"
                                : "Select Plan"}
                            </Button>
                          </div>
                        ))
                      ) : (
                        <div className="col-span-3 text-center py-12">
                          <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-500" />
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-center mb-6">
                      <h2 className="text-2xl font-bold">Order Summary</h2>
                      <p className="text-slate-500 text-sm">
                        Review your plan before proceeding.
                      </p>
                    </div>
                    <Card className="bg-slate-50 border-slate-200 overflow-hidden">
                      <div className="bg-slate-100 p-4 flex justify-between items-center border-b border-slate-200">
                        <div>
                          <h3 className="font-bold text-slate-900">
                            {selectedPlan.displayName}
                          </h3>
                          <Badge variant="secondary" className="mt-1">
                            {billingCycle}
                          </Badge>
                        </div>
                        <div className="text-right">
                          <div className="text-xl font-bold">
                            {formatCurrency(basePrice)}
                          </div>
                          <button
                            onClick={() => setSelectedPlan(null)}
                            className="text-xs text-blue-600 hover:underline flex items-center justify-end gap-1 mt-1">
                            <RotateCcw className="h-3 w-3" /> Change Plan
                          </button>
                        </div>
                      </div>
                      <div className="p-4 space-y-3 text-sm">
                        <div className="flex justify-between text-slate-600">
                          <span>Base Amount</span>
                          <span>{formatCurrency(basePrice)}</span>
                        </div>
                        <div className="flex justify-between text-slate-600">
                          <span>GST (18%)</span>
                          <span>{formatCurrency(gst)}</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between font-bold text-lg text-slate-900">
                          <span>Total Payable</span>
                          <span>{formatCurrency(total)}</span>
                        </div>
                      </div>
                    </Card>
                    <Button
                      onClick={confirmPlan}
                      className="w-full h-12 text-lg font-bold bg-gradient-to-r from-blue-600 to-violet-600 shadow-lg hover:shadow-blue-500/25">
                      Continue <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </>
                )}
              </motion.div>
            )}

            {/* STEP 2: REGISTER */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6">
                <div className="text-center">
                  <h2 className="text-2xl font-bold">Create Account</h2>
                  <p className="text-slate-500">
                    Enter your details to get started.
                  </p>
                </div>

                <form
                  onSubmit={userForm.handleSubmit(onRegister)}
                  className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>Full Name</Label>
                      <Input
                        {...userForm.register("name")}
                        placeholder="Dr. John Doe"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Phone Number</Label>
                      <Input
                        {...userForm.register("phone")}
                        placeholder="9876543210"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Email Address</Label>
                    <Input
                      {...userForm.register("email")}
                      type="email"
                      placeholder="john@lab.com"
                    />
                    {userForm.formState.errors.email && (
                      <p className="text-xs text-red-500">
                        {userForm.formState.errors.email.message as string}
                      </p>
                    )}
                  </div>

                  <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <div className="space-y-1.5">
                      <Label>Create Password</Label>
                      <div className="relative">
                        <Input
                          {...userForm.register("password")}
                          type={showPass ? "text" : "password"}
                          placeholder="••••••••"
                          className="bg-white"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPass(!showPass)}
                          className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600">
                          {showPass ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <PasswordCheck
                        label="Min 8 chars"
                        valid={passChecks.length}
                      />
                      <PasswordCheck
                        label="1 Number"
                        valid={passChecks.number}
                      />
                      <PasswordCheck
                        label="1 Letter"
                        valid={passChecks.letter}
                      />
                      <PasswordCheck
                        label="Special Char"
                        valid={passChecks.special}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Confirm Password</Label>
                      <Input
                        {...userForm.register("confirmPassword")}
                        type="password"
                        placeholder="••••••••"
                        className="bg-white"
                      />
                      {userForm.formState.errors.confirmPassword && (
                        <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
                          <XCircle className="h-3 w-3" /> Passwords do not match
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setStep(1)}>
                      <ChevronLeft className="h-4 w-4" /> Back
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1 h-11 text-base font-semibold bg-blue-600 hover:bg-blue-700"
                      disabled={loading}>
                      {loading ? (
                        <Loader2 className="animate-spin" />
                      ) : (
                        "Create Account"
                      )}
                    </Button>
                  </div>
                </form>
              </motion.div>
            )}

            {/* STEP 3: OTP */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="text-center space-y-6">
                <div className="bg-blue-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto text-blue-600 animate-pulse">
                  <Mail className="h-10 w-10" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Verify Your Email</h2>

                  <div className="flex items-center justify-center gap-2 mt-2 text-sm text-slate-600">
                    <span>
                      Sent to <strong>{userEmail}</strong>
                    </span>
                    <button
                      onClick={() => setStep(2)}
                      className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50 transition-colors"
                      title="Change Email">
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <form onSubmit={onVerifyOtp} className="space-y-4">
                  <Input
                    name="otp"
                    className="text-center text-3xl tracking-[0.5em] h-16 font-mono font-bold bg-slate-50 border-slate-200 focus:bg-white transition-all"
                    placeholder="000000"
                    maxLength={6}
                    required
                    autoFocus
                  />
                  <Button
                    type="submit"
                    className="w-full h-12 text-lg font-bold bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/25"
                    disabled={loading}>
                    {loading ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      "Verify Code"
                    )}
                  </Button>
                </form>
                <div className="flex justify-between items-center text-sm px-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setStep(2)}
                    className="text-slate-400 hover:text-slate-600">
                    <ChevronLeft className="h-3 w-3 mr-1" /> Back
                  </Button>
                  <button
                    onClick={onResendOtp}
                    disabled={timer > 0}
                    className={`font-medium flex items-center gap-1 ${timer > 0 ? "text-slate-400" : "text-blue-600 hover:underline"}`}>
                    {timer > 0 ? (
                      `Resend in ${timer}s`
                    ) : (
                      <>
                        <RotateCcw className="h-3 w-3" /> Resend Code
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 4: LAB SETUP */}
            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-5">
                <div className="text-center mb-4">
                  <h2 className="text-2xl font-bold">Setup Your Lab</h2>
                  <p className="text-slate-500">Enter your business details.</p>
                </div>
                <form
                  onSubmit={labForm.handleSubmit(onLabSubmit)}
                  className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>Lab Business Name</Label>
                    <Input
                      {...labForm.register("labName")}
                      placeholder="e.g. City Diagnostics"
                    />
                    {labForm.formState.errors.labName && (
                      <span className="text-xs text-red-500 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />{" "}
                        {labForm.formState.errors.labName.message as string}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>License No.</Label>
                      <Input {...labForm.register("licenseNumber")} />
                      {labForm.formState.errors.licenseNumber && (
                        <span className="text-xs text-red-500">
                          {
                            labForm.formState.errors.licenseNumber
                              .message as string
                          }
                        </span>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label>GST No. (Optional)</Label>
                      <Input {...labForm.register("gstNumber")} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>Official Email</Label>
                      <Input {...labForm.register("email")} type="email" />
                      {labForm.formState.errors.email && (
                        <span className="text-xs text-red-500">
                          {labForm.formState.errors.email.message as string}
                        </span>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label>Office Phone</Label>
                      <Input {...labForm.register("phone")} />
                      {labForm.formState.errors.phone && (
                        <span className="text-xs text-red-500">
                          {labForm.formState.errors.phone.message as string}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Address</Label>
                    <Input {...labForm.register("address")} />
                    {labForm.formState.errors.address && (
                      <span className="text-xs text-red-500">
                        {labForm.formState.errors.address.message as string}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1.5">
                      <Label>City</Label>
                      <Input {...labForm.register("city")} />
                      {labForm.formState.errors.city && (
                        <span className="text-xs text-red-500">
                          {labForm.formState.errors.city.message as string}
                        </span>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label>State</Label>
                      <Input {...labForm.register("state")} />
                      {labForm.formState.errors.state && (
                        <span className="text-xs text-red-500">
                          {labForm.formState.errors.state.message as string}
                        </span>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label>Pincode</Label>
                      <Input {...labForm.register("pincode")} />
                      {labForm.formState.errors.pincode && (
                        <span className="text-xs text-red-500">
                          {labForm.formState.errors.pincode.message as string}
                        </span>
                      )}
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 mt-4 text-lg font-bold bg-blue-600 hover:bg-blue-700"
                    disabled={loading}>
                    {loading ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      "Save & Continue"
                    )}
                  </Button>
                </form>
              </motion.div>
            )}

            {/* STEP 5: PAYMENT & ACTIVATION */}
            {step === 5 && (
              <motion.div
                key="step5"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6 text-center">
                {/* Dynamic Icon based on Price */}
                <div
                  className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto ${selectedPlan?.price === 0 ? "bg-indigo-50 text-indigo-600 animate-pulse" : "bg-green-50 text-green-600"}`}>
                  {selectedPlan?.price === 0 ? (
                    <Rocket className="h-10 w-10" />
                  ) : (
                    <ShieldCheck className="h-10 w-10" />
                  )}
                </div>

                <div>
                  <h2 className="text-2xl font-bold">
                    {selectedPlan?.price === 0
                      ? "Activate Free Trial"
                      : "Complete Payment"}
                  </h2>
                  <p className="text-slate-500">
                    {selectedPlan?.price === 0
                      ? "Start your 7-day journey instantly."
                      : "Secure checkout via Razorpay"}
                  </p>
                </div>

                <Card className="bg-slate-50 border-slate-200">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-slate-600">Total Amount</span>
                      <span className="text-2xl font-bold text-slate-900">
                        {formatCurrency(total)}
                      </span>
                    </div>
                    {selectedPlan?.price > 0 && (
                      <div className="text-xs text-slate-500 text-right">
                        Inclusive of 18% GST
                      </div>
                    )}
                  </CardContent>
                </Card>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setStep(4)}
                    className="h-14">
                    <ChevronLeft className="h-4 w-4" /> Back
                  </Button>
                  <Button
                    onClick={onPayment}
                    className={`flex-1 h-14 text-xl font-bold shadow-xl transform hover:scale-[1.02] transition-all ${selectedPlan?.price === 0 ? "bg-gradient-to-r from-indigo-600 to-blue-600 hover:shadow-indigo-500/30" : "bg-gradient-to-r from-blue-600 to-violet-600 hover:shadow-blue-500/30"}`}
                    disabled={loading}>
                    {loading ? (
                      <Loader2 className="animate-spin" />
                    ) : selectedPlan?.price === 0 ? (
                      "Start Free Trial 🚀"
                    ) : (
                      "Pay Now"
                    )}
                  </Button>
                </div>
                <p className="text-xs text-slate-400">
                  {selectedPlan?.price === 0
                    ? "No credit card required. Upgrade anytime."
                    : "By paying, you agree to our Terms of Service."}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>

        {/* === FOOTER: LOGIN OPTION === */}
        <div className="bg-slate-50/80 p-4 border-t border-slate-100 text-center text-sm text-slate-600">
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-blue-600 font-bold hover:underline">
            Log in here
          </Link>
        </div>
      </Card>
    </div>
  );
}

// --- SUB-COMPONENTS ---

function PasswordCheck({ label, valid }: { label: string; valid: boolean }) {
  return (
    <div
      className={`flex items-center gap-2 text-xs font-medium transition-colors duration-300 ${valid ? "text-green-600" : "text-slate-400"}`}>
      <div
        className={`h-4 w-4 rounded-full flex items-center justify-center border transition-all ${valid ? "bg-green-100 border-green-200" : "border-slate-200 bg-slate-50"}`}>
        {valid && <Check className="h-2.5 w-2.5" />}
      </div>
      {label}
    </div>
  );
}

function StepIcon({ step, num, label }: any) {
  const isDone = step > num;
  const isCurrent = step === num;
  return (
    <div className="flex flex-col items-center z-10">
      <div
        className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all duration-500 ${isDone ? "bg-green-500 border-green-500 text-white" : isCurrent ? "border-blue-600 text-blue-600 bg-white ring-4 ring-blue-50 scale-110" : "border-slate-200 bg-white text-slate-300"}`}>
        {isDone ? <Check className="h-4 w-4" /> : num}
      </div>
      <span
        className={`text-[10px] font-bold mt-1.5 uppercase tracking-wide transition-colors ${isCurrent ? "text-blue-600" : "text-slate-400"}`}>
        {label}
      </span>
    </div>
  );
}
