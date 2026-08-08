"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import {
  Loader2,
  Mail,
  Lock,
  KeyRound,
  RotateCcw,
  ArrowLeft,
  ShieldCheck,
  AlertCircle,
  Fingerprint,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Schemas (Preserved exactly as requested)
const emailSchema = z.object({ email: z.string().email() });
const resetSchema = z
  .object({
    otp: z.string().min(6),
    newPassword: z.string().min(8, "Min 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "Mismatch",
  });

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState(1); // 1: Email, 2: Reset
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [timer, setTimer] = useState(0);

  // Forms
  const emailForm = useForm({ resolver: zodResolver(emailSchema) });
  const resetForm = useForm({ resolver: zodResolver(resetSchema) });

  // Timer logic
  useEffect(() => {
    let interval: any;
    if (timer > 0) interval = setInterval(() => setTimer((t) => t - 1), 1000);
    return () => clearInterval(interval);
  }, [timer]);

  // Actions
  const onSendOtp = async (data: any) => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || "Failed to send reset code");
      }
      toast.success(`Reset code sent to ${data.email}`);
      setEmail(data.email);
      setStep(2);
      setTimer(60);
    } catch (e: any) {
      toast.error(e.message || "Error sending code");
    } finally {
      setLoading(false);
    }
  };

  const onReset = async (data: any) => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          code: data.otp,
          newPassword: data.newPassword,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);

      toast.success("Password updated!");
      setTimeout(() => router.push("/login"), 1500);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex w-full bg-white font-sans overflow-hidden">
      {/* ========================================================= */}
      {/* LEFT COLUMN: Form Area (Mobile Friendly)                    */}
      {/* ========================================================= */}
      <div className="w-full lg:w-1/2 flex flex-col justify-between px-6 sm:px-16 md:px-24 py-8 lg:py-12 relative z-10 bg-white">
        {/* TOP LOGO AREA */}
        <div className="flex flex-col items-start gap-3 mb-10 lg:mb-0">
          <Link
            href="/login"
            className="inline-flex items-center text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 hover:text-blue-600 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Login
          </Link>
          <div className="flex items-center gap-3">
            <img
              src="/images/patholab-logo.jpg"
              alt="Patholab.cloud Logo"
              className="h-10 md:h-12 w-auto object-contain"
              onError={(e) => {
                e.currentTarget.style.display = "none";
                e.currentTarget.parentElement?.classList.add("fallback-logo");
              }}
            />
            <span className="text-2xl font-extrabold text-slate-900 tracking-tight hidden fallback-logo-text">
              Patholab.cloud
            </span>
          </div>
        </div>

        {/* Center Form Container */}
        <div className="w-full max-w-sm mx-auto">
          {/* STEP 1: EMAIL REQUEST */}
          {step === 1 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
              <div className="space-y-2">
                <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
                  Reset Password
                </h1>
                <p className="text-sm text-slate-500 font-medium leading-relaxed">
                  Enter the email address associated with your account, and
                  we'll send you a secure recovery code.
                </p>
              </div>

              <form
                onSubmit={emailForm.handleSubmit(onSendOtp)}
                className="space-y-6">
                <div className="space-y-1.5">
                  <Label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Email Address
                  </Label>
                  <div className="relative group">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-600 transition-colors duration-300" />
                    <Input
                      {...emailForm.register("email")}
                      className={`pl-10 h-12 rounded-xl bg-slate-50 border-slate-200 text-slate-900 font-medium focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-300 ${
                        emailForm.formState.errors.email
                          ? "border-red-300 bg-red-50 focus:border-red-500 focus:ring-red-500/20"
                          : ""
                      }`}
                      placeholder="admin@patholab.cloud"
                      autoFocus
                    />
                  </div>
                  {emailForm.formState.errors.email && (
                    <p className="text-xs text-red-600 font-bold flex items-center gap-1.5 mt-1.5 animate-in slide-in-from-top-1">
                      <AlertCircle className="h-3.5 w-3.5" />
                      Valid email required
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 rounded-xl text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 transition-all duration-300">
                  {loading ? (
                    <Loader2 className="animate-spin h-5 w-5" />
                  ) : (
                    "Send Recovery Code"
                  )}
                </Button>
              </form>
            </div>
          )}

          {/* STEP 2: RESET PASSWORD */}
          {step === 2 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-8">
              <div className="space-y-2">
                <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
                  Secure your account
                </h1>
                <p className="text-sm text-slate-500 font-medium">
                  We've sent a 6-digit verification code to{" "}
                  <strong className="text-slate-900 font-bold">{email}</strong>.
                </p>
              </div>

              <form
                onSubmit={resetForm.handleSubmit(onReset)}
                className="space-y-6">
                {/* OTP Input Block */}
                <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                    <KeyRound className="h-3.5 w-3.5" /> Verification Code
                  </Label>
                  <Input
                    {...resetForm.register("otp")}
                    className="h-14 text-center text-2xl tracking-[0.5em] font-mono font-black text-slate-900 bg-white border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl transition-all"
                    placeholder="000000"
                    maxLength={6}
                    autoFocus
                  />
                </div>

                <div className="space-y-5">
                  <div className="space-y-1.5">
                    <Label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      New Password
                    </Label>
                    <div className="relative group">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                      <Input
                        type="password"
                        {...resetForm.register("newPassword")}
                        className="pl-10 h-12 rounded-xl bg-slate-50 border-slate-200 text-slate-900 font-medium focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                        placeholder="Minimum 8 characters"
                      />
                    </div>
                    {resetForm.formState.errors.newPassword && (
                      <p className="text-xs text-red-600 font-bold flex items-center gap-1.5 mt-1.5">
                        <AlertCircle className="h-3.5 w-3.5" />
                        {
                          resetForm.formState.errors.newPassword
                            .message as string
                        }
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Confirm Password
                    </Label>
                    <div className="relative group">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                      <Input
                        type="password"
                        {...resetForm.register("confirmPassword")}
                        className={`pl-10 h-12 rounded-xl bg-slate-50 border-slate-200 text-slate-900 font-medium focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all ${
                          resetForm.formState.errors.confirmPassword
                            ? "border-red-300 bg-red-50"
                            : ""
                        }`}
                        placeholder="Repeat new password"
                      />
                    </div>
                    {resetForm.formState.errors.confirmPassword && (
                      <p className="text-xs text-red-600 font-bold flex items-center gap-1.5 mt-1.5 animate-in slide-in-from-top-1">
                        <AlertCircle className="h-3.5 w-3.5" />
                        Passwords do not match
                      </p>
                    )}
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 rounded-xl text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 transition-all duration-300 active:scale-[0.98]">
                  {loading ? (
                    <Loader2 className="animate-spin h-5 w-5" />
                  ) : (
                    "Update Password & Login"
                  )}
                </Button>
              </form>

              {/* Resend Action */}
              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => onSendOtp({ email })}
                  disabled={timer > 0}
                  className={`inline-flex items-center justify-center gap-2 text-sm font-bold transition-colors ${
                    timer > 0
                      ? "text-slate-400 cursor-not-allowed"
                      : "text-blue-600 hover:text-blue-800"
                  }`}>
                  {timer > 0 ? (
                    `Resend code in ${timer}s`
                  ) : (
                    <>
                      <RotateCcw className="h-4 w-4" /> Resend Code
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer & Trust Badges */}
        <div className="mt-12 lg:mt-0 space-y-8">
          <div className="flex flex-wrap items-center justify-center gap-6 lg:gap-8 opacity-75 grayscale hover:grayscale-0 transition-all duration-500 select-none">
            <img
              src="/images/make-in-india.png"
              alt="Make in India"
              className="h-10 md:h-12 w-auto object-contain drop-shadow-sm hover:scale-105 transition-transform"
            />
            <img
              src="/images/iso-9001.png"
              alt="ISO 9001:2015"
              className="h-10 md:h-12 w-auto object-contain drop-shadow-sm hover:scale-105 transition-transform"
            />
            <img
              src="/images/iso-27001.png"
              alt="ISO/IEC 27001:2022"
              className="h-10 md:h-12 w-auto object-contain drop-shadow-sm hover:scale-105 transition-transform"
            />
            <img
              src="/images/iso-20000.png"
              alt="ISO 20000-1:2018"
              className="h-10 md:h-12 w-auto object-contain drop-shadow-sm hover:scale-105 transition-transform"
            />
          </div>

          <div className="flex items-center justify-center gap-5 text-[12px] font-semibold text-slate-400">
            <Link
              href="https://patholab.cloud/privacy-policy"
              className="hover:text-slate-600 transition-colors">
              Privacy Policy
            </Link>
            <span className="w-1 h-1 rounded-full bg-slate-300"></span>
            <Link
              href="https://patholab.cloud/terms-and-conditions"
              className="hover:text-slate-600 transition-colors">
              Terms of Service
            </Link>
            <span className="w-1 h-1 rounded-full bg-slate-300"></span>
            <Link
              href="https://wa.me/918402010207?text=Hi,%20I%20am%20interested%20in%20Patholab.cloud%20software.%20I%20want%20to%20book%20a%20free%20demo."
              className="hover:text-slate-600 transition-colors">
              Contact Support
            </Link>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* RIGHT COLUMN: Desktop Image & Marketing                   */}
      {/* ========================================================= */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-slate-900 overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="/images/login-bg.jpg"
            alt="Patholab Cloud UI"
            className="w-full h-full object-cover opacity-50 mix-blend-overlay transition-opacity duration-1000"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-[#0f172a]/60 to-blue-900/30"></div>
        </div>

        <div className="relative w-full flex flex-col justify-end p-16 z-10 text-white pb-24">
          <div className="max-w-lg">
            <div className="bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/20 w-fit mb-8 shadow-[0_0_30px_rgba(59,130,246,0.15)]">
              <Fingerprint className="h-8 w-8 text-blue-400" />
            </div>

            <h2 className="text-4xl font-extrabold tracking-tight mb-4 leading-tight text-white drop-shadow-md">
              Secure Account Recovery.
            </h2>

            <p className="text-lg text-slate-300 mb-10 leading-relaxed font-medium drop-shadow-sm">
              We employ bank-grade encryption and strict verification protocols
              to ensure your laboratory data remains exclusively yours.
            </p>

            <div className="space-y-4">
              <div className="flex items-center gap-3 bg-white/5 border border-white/10 p-3.5 rounded-xl backdrop-blur-md hover:bg-white/10 transition-colors">
                <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                <span className="text-sm font-semibold text-slate-100">
                  Enterprise Security Standard • 256-Bit SSL
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
