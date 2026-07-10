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
  Building2,
  MapPin,
  CreditCard,
  User,
  FlaskConical,
} from "lucide-react";

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

  const onPayment = async () => {
    if (!selectedPlan || !userId || !labId) return;
    setLoading(true);

    try {
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
        setTimeout(() => router.push("/login"), 2000);
        return;
      }

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
        name: "Patholab",
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
        theme: { color: "#059669" }, // Changed to Emerald
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

  // Define steps for the sidebar
  const stepsList = [
    { num: 1, title: "Select Plan", icon: Activity },
    { num: 2, title: "Create Account", icon: User },
    { num: 3, title: "Verify Email", icon: Mail },
    { num: 4, title: "Lab Setup", icon: Building2 },
    { num: 5, title: "Activation", icon: CreditCard },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-muted/30 selection:bg-emerald-500 selection:text-white">
      {/* === LEFT SIDEBAR: PROGRESS & BRANDING === */}
      <div className="md:w-1/3 lg:w-1/4 bg-slate-950 text-white flex flex-col justify-between p-6 md:p-8 relative overflow-hidden shrink-0 border-b md:border-b-0 md:border-r border-slate-800">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div>
          {/* Logo */}
          <Link
            href="/"
            className="inline-flex items-center gap-3 group relative z-10 mb-10">
            <div className="bg-emerald-500/20 border border-emerald-500/30 p-2 rounded-xl group-hover:bg-emerald-500/30 transition-colors">
              <FlaskConical className="h-6 w-6 text-emerald-400" />
            </div>
            <span className="text-xl font-extrabold tracking-tight">
              patholab<span className="text-emerald-400">.cloud</span>
            </span>
          </Link>

          {/* Desktop Vertical Stepper */}
          <div className="hidden md:block relative z-10 space-y-8 mt-12">
            <div className="absolute left-[15px] top-4 bottom-4 w-[2px] bg-slate-800 -z-10 rounded-full"></div>
            {stepsList.map((s) => {
              const isDone = step > s.num;
              const isCurrent = step === s.num;
              return (
                <div
                  key={s.num}
                  className={`flex items-center gap-4 transition-all duration-300 ${isCurrent ? "opacity-100" : isDone ? "opacity-70" : "opacity-40"}`}>
                  <div
                    className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 border-2 transition-colors duration-300 ${isDone ? "bg-emerald-500 border-emerald-500 text-slate-950" : isCurrent ? "bg-slate-950 border-emerald-400 text-emerald-400" : "bg-slate-950 border-slate-700 text-muted-foreground"}`}>
                    {isDone ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <s.icon className="h-4 w-4" />
                    )}
                  </div>
                  <div>
                    <p
                      className={`text-sm font-bold uppercase tracking-wider ${isCurrent ? "text-white" : "text-slate-400"}`}>
                      Step {s.num}
                    </p>
                    <p
                      className={`text-base font-semibold ${isCurrent ? "text-emerald-400" : "text-slate-300"}`}>
                      {s.title}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Mobile Horizontal Progress */}
          <div className="md:hidden flex items-center justify-between relative z-10 mt-2">
            <div className="flex flex-col">
              <span className="text-xs text-emerald-400 font-bold uppercase tracking-wider">
                Step {step} of 5
              </span>
              <span className="text-sm font-semibold text-white">
                {stepsList[step - 1].title}
              </span>
            </div>
            {step > 1 && (
              <button
                onClick={resetFlow}
                className="text-xs text-muted-foreground/70 flex items-center gap-1 hover:text-white transition-colors">
                <RotateCcw className="h-3 w-3" /> Restart
              </button>
            )}
          </div>
        </div>

        {/* Desktop Footer Actions */}
        <div className="hidden md:flex flex-col gap-4 relative z-10 mt-12">
          {step > 1 && (
            <button
              onClick={resetFlow}
              className="text-xs font-semibold text-muted-foreground/70 hover:text-white flex items-center gap-2 transition-colors w-fit">
              <RotateCcw className="h-4 w-4" /> Start Over
            </button>
          )}
          <Link
            href="/"
            className="text-xs font-semibold text-muted-foreground/70 hover:text-white flex items-center gap-2 transition-colors w-fit">
            <Home className="h-4 w-4" /> Back to Home
          </Link>
        </div>
      </div>

      {/* === RIGHT CONTENT: FORMS === */}
      <div className="flex-1 flex flex-col overflow-y-auto relative">
        <div className="w-full max-w-4xl mx-auto p-4 md:p-8 lg:p-12 my-auto">
          {/* STEP 1: PLAN SELECTION */}
          {step === 1 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
              {!selectedPlan ? (
                <>
                  <div className="text-center md:text-left space-y-2">
                    <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
                      Select your plan
                    </h2>
                    <p className="text-muted-foreground text-sm md:text-base">
                      Transparent pricing for labs of all sizes. Upgrade or
                      cancel anytime.
                    </p>
                  </div>

                  <div className="flex items-center justify-center md:justify-start gap-2 bg-slate-200/50 w-fit p-1 rounded-xl">
                    <button
                      onClick={() => setIsYearly(false)}
                      className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${!isYearly ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-slate-700"}`}>
                      Monthly
                    </button>
                    <button
                      onClick={() => setIsYearly(true)}
                      className={`px-5 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-1.5 ${isYearly ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-slate-700"}`}>
                      Yearly{" "}
                      <span className="bg-emerald-100 text-emerald-700 text-[10px] px-1.5 py-0.5 rounded">
                        Save 20%
                      </span>
                    </button>
                  </div>

                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {displayPlans.length > 0 ? (
                      displayPlans.map((plan) => (
                        <div
                          key={plan.id}
                          onClick={() => selectPlan(plan)}
                          className={`relative group cursor-pointer flex flex-col bg-card rounded-2xl border-2 p-6 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg ${plan.isPopular ? "border-emerald-500 shadow-md" : "border-border hover:border-emerald-300"}`}>
                          {plan.isPopular && (
                            <div className="absolute top-0 right-6 -translate-y-1/2 bg-emerald-500 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                              Most Popular
                            </div>
                          )}
                          <h3 className="font-bold text-xl text-foreground mb-1">
                            {plan.displayName}
                          </h3>
                          <div className="text-4xl font-extrabold text-foreground mb-2 tracking-tight">
                            {formatCurrency(plan.price)}
                            <span className="text-sm font-medium text-slate-400">
                              /mo
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground mb-6 flex-1">
                            {plan.description}
                          </p>
                          <Button
                            className={`w-full h-11 text-sm font-bold rounded-xl transition-all ${plan.isPopular ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "bg-muted hover:bg-slate-200 text-foreground"}`}>
                            {plan.price === 0
                              ? "Start Free Trial"
                              : "Select Plan"}
                          </Button>
                        </div>
                      ))
                    ) : (
                      <div className="col-span-full flex flex-col items-center justify-center py-20 text-muted-foreground/70 space-y-3">
                        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
                        <p className="text-sm font-medium">
                          Loading pricing plans...
                        </p>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                /* ORDER SUMMARY */
                <div className="max-w-md mx-auto w-full animate-in fade-in zoom-in-95 duration-300">
                  <div className="text-center mb-8 space-y-2">
                    <h2 className="text-3xl font-extrabold tracking-tight text-foreground">
                      Order Summary
                    </h2>
                    <p className="text-muted-foreground text-sm">
                      Review your selected plan.
                    </p>
                  </div>

                  <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden mb-6">
                    <div className="bg-muted/30 p-5 flex justify-between items-center border-b border-slate-100">
                      <div>
                        <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
                          {selectedPlan.displayName}
                          <Badge
                            variant="secondary"
                            className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 text-[10px] uppercase border-0">
                            {billingCycle}
                          </Badge>
                        </h3>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-extrabold text-foreground tracking-tight">
                          {formatCurrency(basePrice)}
                        </div>
                      </div>
                    </div>
                    <div className="p-5 space-y-4 text-sm font-medium">
                      <div className="flex justify-between text-muted-foreground">
                        <span>Base Amount</span>
                        <span className="text-foreground">
                          {formatCurrency(basePrice)}
                        </span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>GST (18%)</span>
                        <span className="text-foreground">
                          {formatCurrency(gst)}
                        </span>
                      </div>
                      <Separator className="bg-muted" />
                      <div className="flex justify-between font-extrabold text-xl text-foreground items-end">
                        <span>Total Payable</span>
                        <span className="text-emerald-600">
                          {formatCurrency(total)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3">
                    <Button
                      onClick={confirmPlan}
                      className="w-full h-12 text-base font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm">
                      Continue to Account{" "}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                    <button
                      onClick={() => setSelectedPlan(null)}
                      className="text-sm text-muted-foreground hover:text-foreground font-semibold transition-colors py-2 flex items-center justify-center gap-2">
                      <ChevronLeft className="h-4 w-4" /> Change Plan
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: REGISTER */}
          {step === 2 && (
            <div className="max-w-md mx-auto w-full animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="mb-8 space-y-2">
                <h2 className="text-3xl font-extrabold tracking-tight text-foreground">
                  Create Account
                </h2>
                <p className="text-muted-foreground text-sm">
                  Set up your admin credentials.
                </p>
              </div>

              <form
                onSubmit={userForm.handleSubmit(onRegister)}
                className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                      Full Name
                    </Label>
                    <Input
                      {...userForm.register("name")}
                      placeholder="Dr. John Doe"
                      className="h-11 rounded-lg bg-card border-border focus:border-emerald-500 focus:ring-emerald-500/20"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                      Phone
                    </Label>
                    <Input
                      {...userForm.register("phone")}
                      placeholder="9876543210"
                      className="h-11 rounded-lg bg-card border-border focus:border-emerald-500 focus:ring-emerald-500/20"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                    Email Address
                  </Label>
                  <Input
                    {...userForm.register("email")}
                    type="email"
                    placeholder="john@lab.com"
                    className="h-11 rounded-lg bg-card border-border focus:border-emerald-500 focus:ring-emerald-500/20"
                  />
                  {userForm.formState.errors.email && (
                    <p className="text-xs text-red-500 font-bold mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {userForm.formState.errors.email.message as string}
                    </p>
                  )}
                </div>

                <div className="p-5 bg-card rounded-2xl border border-border shadow-sm space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                      Password
                    </Label>
                    <div className="relative">
                      <Input
                        {...userForm.register("password")}
                        type={showPass ? "text" : "password"}
                        placeholder="••••••••"
                        className="h-11 rounded-lg pr-10 border-border focus:border-emerald-500 focus:ring-emerald-500/20"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPass(!showPass)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/70 hover:text-muted-foreground">
                        {showPass ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Emerald Themed Password Checks */}
                  <div className="grid grid-cols-2 gap-y-2 gap-x-4 p-3 bg-muted/30 rounded-lg border border-slate-100">
                    <PasswordCheck
                      label="Min 8 chars"
                      valid={passChecks.length}
                    />
                    <PasswordCheck label="1 Number" valid={passChecks.number} />
                    <PasswordCheck label="1 Letter" valid={passChecks.letter} />
                    <PasswordCheck
                      label="Special Char"
                      valid={passChecks.special}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                      Confirm Password
                    </Label>
                    <Input
                      {...userForm.register("confirmPassword")}
                      type="password"
                      placeholder="••••••••"
                      className="h-11 rounded-lg border-border focus:border-emerald-500 focus:ring-emerald-500/20"
                    />
                    {userForm.formState.errors.confirmPassword && (
                      <p className="text-xs text-red-500 font-bold mt-1 flex items-center gap-1">
                        <XCircle className="h-3 w-3" /> Passwords do not match
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep(1)}
                    className="h-12 w-12 rounded-xl border-border text-muted-foreground hover:bg-muted shrink-0 p-0 flex items-center justify-center">
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 h-12 rounded-xl text-base font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                    disabled={loading}>
                    {loading ? (
                      <Loader2 className="animate-spin h-5 w-5" />
                    ) : (
                      "Verify Email Next"
                    )}
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* STEP 3: OTP */}
          {step === 3 && (
            <div className="max-w-md mx-auto w-full animate-in fade-in slide-in-from-right-4 duration-500 text-center">
              <div className="bg-emerald-50 border border-emerald-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto text-emerald-600 mb-6 shadow-sm">
                <Mail className="h-10 w-10" />
              </div>

              <h2 className="text-3xl font-extrabold tracking-tight text-foreground mb-2">
                Check your inbox
              </h2>
              <div className="flex items-center justify-center gap-2 mb-8 text-sm text-muted-foreground">
                <span>
                  Sent to{" "}
                  <strong className="text-foreground">{userEmail}</strong>
                </span>
                <button
                  onClick={() => setStep(2)}
                  className="text-muted-foreground/70 hover:text-emerald-600 transition-colors"
                  title="Change Email">
                  <Edit2 className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={onVerifyOtp} className="space-y-6">
                <Input
                  name="otp"
                  className="text-center text-4xl tracking-[0.5em] h-16 font-mono font-bold bg-card border-2 border-border focus:border-emerald-500 focus:ring-emerald-500/20 rounded-xl"
                  placeholder="000000"
                  maxLength={6}
                  required
                  autoFocus
                />

                <Button
                  type="submit"
                  className="w-full h-12 rounded-xl text-base font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                  disabled={loading}>
                  {loading ? (
                    <Loader2 className="animate-spin h-5 w-5" />
                  ) : (
                    "Verify Code"
                  )}
                </Button>
              </form>

              <div className="mt-8 flex justify-center">
                <button
                  onClick={onResendOtp}
                  disabled={timer > 0}
                  className={`text-sm font-semibold flex items-center gap-2 transition-colors ${timer > 0 ? "text-slate-400" : "text-emerald-600 hover:text-emerald-700"}`}>
                  <RotateCcw className="h-4 w-4" />
                  {timer > 0 ? `Resend code in ${timer}s` : "Resend Code"}
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: LAB SETUP */}
          {step === 4 && (
            <div className="max-w-xl mx-auto w-full animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="mb-8 space-y-2">
                <h2 className="text-3xl font-extrabold tracking-tight text-foreground">
                  Lab Details
                </h2>
                <p className="text-muted-foreground text-sm">
                  Tell us about your business to setup your workspace.
                </p>
              </div>

              <form
                onSubmit={labForm.handleSubmit(onLabSubmit)}
                className="space-y-6">
                {/* Section 1: Business Info */}
                <div className="bg-card p-5 rounded-2xl border border-border shadow-sm space-y-4">
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
                    <Building2 className="w-4 h-4 text-emerald-500" /> Business
                    Information
                  </h3>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                      Lab Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      {...labForm.register("labName")}
                      placeholder="e.g. Apex Diagnostics"
                      className="h-11 rounded-lg border-border focus:border-emerald-500"
                    />
                    {labForm.formState.errors.labName && (
                      <p className="text-xs text-red-500 font-bold">
                        {labForm.formState.errors.labName.message as string}
                      </p>
                    )}
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                        License No. <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        {...labForm.register("licenseNumber")}
                        className="h-11 rounded-lg border-border focus:border-emerald-500"
                        placeholder="Required for reports"
                      />
                      {labForm.formState.errors.licenseNumber && (
                        <p className="text-xs text-red-500 font-bold">
                          {
                            labForm.formState.errors.licenseNumber
                              .message as string
                          }
                        </p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                        GST No. (Optional)
                      </Label>
                      <Input
                        {...labForm.register("gstNumber")}
                        className="h-11 rounded-lg border-border focus:border-emerald-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 2: Contact & Location */}
                <div className="bg-card p-5 rounded-2xl border border-border shadow-sm space-y-4">
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
                    <MapPin className="w-4 h-4 text-emerald-500" /> Contact &
                    Location
                  </h3>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                        Official Email <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        {...labForm.register("email")}
                        type="email"
                        className="h-11 rounded-lg border-border focus:border-emerald-500"
                      />
                      {labForm.formState.errors.email && (
                        <p className="text-xs text-red-500 font-bold">
                          {labForm.formState.errors.email.message as string}
                        </p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                        Office Phone <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        {...labForm.register("phone")}
                        className="h-11 rounded-lg border-border focus:border-emerald-500"
                      />
                      {labForm.formState.errors.phone && (
                        <p className="text-xs text-red-500 font-bold">
                          {labForm.formState.errors.phone.message as string}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                      Street Address <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      {...labForm.register("address")}
                      className="h-11 rounded-lg border-border focus:border-emerald-500"
                    />
                    {labForm.formState.errors.address && (
                      <p className="text-xs text-red-500 font-bold">
                        {labForm.formState.errors.address.message as string}
                      </p>
                    )}
                  </div>

                  <div className="grid sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                        City <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        {...labForm.register("city")}
                        className="h-11 rounded-lg border-border focus:border-emerald-500"
                      />
                      {labForm.formState.errors.city && (
                        <p className="text-xs text-red-500 font-bold">
                          {labForm.formState.errors.city.message as string}
                        </p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                        State <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        {...labForm.register("state")}
                        className="h-11 rounded-lg border-border focus:border-emerald-500"
                      />
                      {labForm.formState.errors.state && (
                        <p className="text-xs text-red-500 font-bold">
                          {labForm.formState.errors.state.message as string}
                        </p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                        Pincode <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        {...labForm.register("pincode")}
                        className="h-11 rounded-lg border-border focus:border-emerald-500"
                      />
                      {labForm.formState.errors.pincode && (
                        <p className="text-xs text-red-500 font-bold">
                          {labForm.formState.errors.pincode.message as string}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <Button
                    type="submit"
                    className="w-full h-12 rounded-xl text-base font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                    disabled={loading}>
                    {loading ? (
                      <Loader2 className="animate-spin h-5 w-5" />
                    ) : (
                      "Save Workspace & Continue"
                    )}
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* STEP 5: PAYMENT & ACTIVATION */}
          {step === 5 && (
            <div className="max-w-md mx-auto w-full animate-in fade-in slide-in-from-right-4 duration-500 text-center">
              <div className="mb-8">
                <div
                  className={`w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm border ${selectedPlan?.price === 0 ? "bg-slate-900 border-slate-800 text-emerald-400" : "bg-emerald-50 border-emerald-100 text-emerald-600"}`}>
                  {selectedPlan?.price === 0 ? (
                    <Rocket className="h-12 w-12" />
                  ) : (
                    <ShieldCheck className="h-12 w-12" />
                  )}
                </div>
                <h2 className="text-3xl font-extrabold tracking-tight text-foreground mb-2">
                  {selectedPlan?.price === 0
                    ? "Activate Free Trial"
                    : "Complete Payment"}
                </h2>
                <p className="text-muted-foreground text-sm">
                  {selectedPlan?.price === 0
                    ? "Start your 14-day journey instantly, no card required."
                    : "Secure checkout via Razorpay to activate your workspace."}
                </p>
              </div>

              <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden mb-8 text-left">
                <div className="bg-muted/30 p-4 border-b border-slate-100 flex items-center gap-3">
                  <div className="bg-emerald-100 text-emerald-600 p-2 rounded-lg">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">
                      Final Summary
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {selectedPlan?.displayName} ({billingCycle})
                    </p>
                  </div>
                </div>
                <div className="p-6 flex items-center justify-between">
                  <span className="text-sm font-semibold text-muted-foreground">
                    Total Payable
                  </span>
                  <div className="text-right">
                    <span className="text-3xl font-extrabold text-foreground tracking-tight">
                      {formatCurrency(total)}
                    </span>
                    {selectedPlan?.price > 0 && (
                      <p className="text-[10px] text-muted-foreground/70 font-bold uppercase tracking-wider mt-1">
                        INCL. 18% GST
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <Button
                  onClick={onPayment}
                  className="w-full h-14 rounded-xl text-lg font-bold bg-slate-900 hover:bg-slate-800 text-white shadow-lg transition-transform active:scale-[0.98]"
                  disabled={loading}>
                  {loading ? (
                    <Loader2 className="animate-spin h-6 w-6" />
                  ) : selectedPlan?.price === 0 ? (
                    "Launch Dashboard 🚀"
                  ) : (
                    "Pay Securely Now"
                  )}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setStep(4)}
                  className="w-full h-12 text-muted-foreground hover:text-foreground font-semibold">
                  <ChevronLeft className="h-4 w-4 mr-2" /> Back to Lab Details
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// --- SUB-COMPONENTS ---

function PasswordCheck({ label, valid }: { label: string; valid: boolean }) {
  return (
    <div
      className={`flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide transition-colors duration-300 ${valid ? "text-emerald-600" : "text-slate-400"}`}>
      <div
        className={`h-4 w-4 rounded-full flex items-center justify-center border transition-all duration-300 ${valid ? "bg-emerald-100 border-emerald-200 text-emerald-600" : "border-border bg-card"}`}>
        {valid && <Check className="h-2.5 w-2.5" />}
      </div>
      {label}
    </div>
  );
}
