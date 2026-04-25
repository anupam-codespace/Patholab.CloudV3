"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import toast from "react-hot-toast";
import {
  FlaskConical,
  User,
  Mail,
  Phone,
  Building2,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
  CheckCircle2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// --- VALIDATION SCHEMA ---
const registerSchema = z.object({
  labName: z.string().min(3, "Lab name must be at least 3 characters"),
  fullName: z.string().min(2, "Full name is required"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().min(10, "Valid 10-digit phone number required"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Za-z]/, "Must contain at least one letter")
    .regex(/[0-9]/, "Must contain at least one number"),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormValues) => {
    setIsLoading(true);
    try {
      // Replace with your actual API endpoint
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Registration failed");
      }

      toast.success("Workspace created successfully! 🚀");
      router.push("/dashboard"); // Redirect to onboarding or dashboard
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-white selection:bg-emerald-500 selection:text-white">
      {/* LEFT SIDE: CINEMATIC BRANDING (Hidden on Mobile) */}
      <div className="hidden lg:flex w-1/2 bg-slate-950 relative overflow-hidden flex-col justify-between p-12">
        {/* Abstract Glowing Background */}
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-emerald-600/20 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-teal-600/20 blur-[150px] pointer-events-none" />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="bg-emerald-500/20 border border-emerald-500/30 p-2.5 rounded-xl backdrop-blur-md">
            <FlaskConical className="h-6 w-6 text-emerald-400" />
          </div>
          <span className="text-2xl font-black tracking-tight text-white">
            patholab<span className="text-emerald-400">.cloud</span>
          </span>
        </div>

        {/* Hero Text & Features */}
        <div className="relative z-10 max-w-lg mt-12">
          <h1 className="text-4xl font-black text-white leading-tight mb-6">
            The operating system for modern pathology labs.
          </h1>
          <p className="text-lg text-slate-400 font-medium mb-10">
            Join hundreds of forward-thinking laboratories automating their
            workflows, scaling B2B referrals, and delivering ultra-fast WhatsApp
            reports.
          </p>

          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-white font-bold">
                  Bi-Directional Machine Sync
                </h3>
                <p className="text-slate-400 text-sm">
                  Zero manual data entry.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-white font-bold">
                  Instant WhatsApp Delivery
                </h3>
                <p className="text-slate-400 text-sm">
                  Secure PDF reports in seconds.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-white font-bold">
                  Smart Inventory Tracking
                </h3>
                <p className="text-slate-400 text-sm">
                  Stop reagent profit leakage.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer / Trust Badge */}
        <div className="relative z-10 mt-12">
          <div className="flex -space-x-3 mb-3">
            {/* Mock Avatars for Social Proof */}
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="w-10 h-10 rounded-full border-2 border-slate-950 bg-slate-800"
              />
            ))}
          </div>
          <p className="text-sm font-medium text-slate-400">
            Trusted by <strong className="text-white">500+</strong> lab
            technicians across India.
          </p>
        </div>
      </div>

      {/* RIGHT SIDE: REGISTRATION FORM */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 lg:p-24 relative">
        {/* Mobile Logo (Visible only on small screens) */}
        <div className="absolute top-8 left-6 lg:hidden flex items-center gap-2">
          <div className="bg-emerald-100 p-2 rounded-lg">
            <FlaskConical className="h-5 w-5 text-emerald-600" />
          </div>
          <span className="text-xl font-black tracking-tight text-slate-900">
            patholab<span className="text-emerald-600">.cloud</span>
          </span>
        </div>

        <div className="w-full max-w-md mt-12 lg:mt-0">
          <div className="mb-10">
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mb-2">
              Create Workspace
            </h2>
            <p className="text-slate-500 font-medium">
              Start your 14-day free trial. No credit card required.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Lab Name */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                Laboratory Name
              </Label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Building2 className="h-4 w-4 text-slate-400" />
                </div>
                <Input
                  {...register("labName")}
                  placeholder="e.g. Apex Diagnostics"
                  className="pl-10 h-12 rounded-xl bg-slate-50/50 border-slate-200 focus:bg-white focus:border-emerald-500 focus:ring-emerald-500/20 transition-all font-medium"
                />
              </div>
              {errors.labName && (
                <p className="text-xs font-bold text-red-500 mt-1">
                  {errors.labName.message}
                </p>
              )}
            </div>

            {/* Admin Name */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                Admin Full Name
              </Label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <User className="h-4 w-4 text-slate-400" />
                </div>
                <Input
                  {...register("fullName")}
                  placeholder="Dr. John Doe"
                  className="pl-10 h-12 rounded-xl bg-slate-50/50 border-slate-200 focus:bg-white focus:border-emerald-500 focus:ring-emerald-500/20 transition-all font-medium"
                />
              </div>
              {errors.fullName && (
                <p className="text-xs font-bold text-red-500 mt-1">
                  {errors.fullName.message}
                </p>
              )}
            </div>

            {/* Grid for Email & Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                  Official Email
                </Label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Mail className="h-4 w-4 text-slate-400" />
                  </div>
                  <Input
                    {...register("email")}
                    type="email"
                    placeholder="john@lab.com"
                    className="pl-10 h-12 rounded-xl bg-slate-50/50 border-slate-200 focus:bg-white focus:border-emerald-500 focus:ring-emerald-500/20 transition-all font-medium"
                  />
                </div>
                {errors.email && (
                  <p className="text-xs font-bold text-red-500 mt-1">
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                  Phone Number
                </Label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Phone className="h-4 w-4 text-slate-400" />
                  </div>
                  <Input
                    {...register("phone")}
                    type="tel"
                    placeholder="9876543210"
                    className="pl-10 h-12 rounded-xl bg-slate-50/50 border-slate-200 focus:bg-white focus:border-emerald-500 focus:ring-emerald-500/20 transition-all font-medium"
                  />
                </div>
                {errors.phone && (
                  <p className="text-xs font-bold text-red-500 mt-1">
                    {errors.phone.message}
                  </p>
                )}
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                Secure Password
              </Label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-slate-400" />
                </div>
                <Input
                  {...register("password")}
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="pl-10 pr-10 h-12 rounded-xl bg-slate-50/50 border-slate-200 focus:bg-white focus:border-emerald-500 focus:ring-emerald-500/20 transition-all font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-emerald-600 transition-colors">
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs font-bold text-red-500 mt-1">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-14 rounded-xl text-base font-black tracking-wide bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/25 transition-all active:scale-[0.98] mt-4">
              {isLoading ? (
                <Loader2 className="animate-spin h-6 w-6" />
              ) : (
                <span className="flex items-center justify-center gap-2">
                  Launch Your Workspace <ArrowRight className="h-5 w-5" />
                </span>
              )}
            </Button>
          </form>

          {/* Login Fallback */}
          <p className="text-center text-sm font-medium text-slate-500 mt-10">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-emerald-600 hover:text-emerald-700 font-bold hover:underline underline-offset-4 transition-all">
              Sign in to dashboard
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
