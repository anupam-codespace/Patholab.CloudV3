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
        body: JSON.stringify({ email, code: data.otp, newPassword: data.newPassword }),
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
    <div className="min-h-screen flex w-full bg-white selection:bg-cyan-500 selection:text-white">
      {/* === LEFT PANEL: BRANDING & ART (Hidden on Mobile) === */}
      <div className="hidden lg:flex w-1/2 relative overflow-hidden bg-slate-950 flex-col justify-between p-12">
        {/* Abstract Background Gradients */}
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-cyan-600/20 rounded-full blur-[120px] pointer-events-none animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px] pointer-events-none"></div>

        {/* Subtle Grid Overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>

        {/* Logo Area */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="bg-white/10 backdrop-blur-md p-2.5 rounded-xl border border-white/20">
            <ShieldCheck className="h-6 w-6 text-cyan-400" />
          </div>
          <span className="text-xl font-extrabold tracking-tight text-white">
            patholab<span className="text-cyan-400">.cloud</span>
          </span>
        </div>

        {/* Hero Graphic & Text */}
        <div className="relative z-10 space-y-6 max-w-md">
          <div className="bg-cyan-500/10 border border-cyan-500/20 w-16 h-16 rounded-2xl flex items-center justify-center mb-8 shadow-[0_0_30px_rgba(6,182,212,0.15)]">
            <Fingerprint className="h-8 w-8 text-cyan-400" />
          </div>
          <h2 className="text-4xl leading-[1.1] font-extrabold text-white tracking-tight">
            Secure Account Recovery.
          </h2>
          <p className="text-lg text-slate-400 font-medium">
            We employ bank-grade encryption and strict verification protocols to
            ensure your laboratory data remains exclusively yours.
          </p>
        </div>

        {/* Footer Note */}
        <div className="relative z-10 text-xs font-semibold text-slate-500 uppercase tracking-widest">
          Enterprise Security Standard • 256-Bit SSL
        </div>
      </div>

      {/* === RIGHT PANEL: FORM AREA === */}
      <div className="w-full lg:w-1/2 flex flex-col p-6 sm:p-12 relative overflow-y-auto">
        <div className="w-full max-w-[400px] m-auto space-y-8">
          {/* Back to Login Link */}
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors w-fit">
            <ArrowLeft className="h-4 w-4" /> Back to login
          </Link>

          {/* Form Container */}
          <div className="bg-white">
            {/* STEP 1: EMAIL REQUEST */}
            {step === 1 && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
                <div className="space-y-2">
                  <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
                    Reset password
                  </h1>
                  <p className="text-sm text-slate-500 font-medium">
                    Enter the email address associated with your account, and
                    we'll send you a secure recovery code.
                  </p>
                </div>

                <form
                  onSubmit={emailForm.handleSubmit(onSendOtp)}
                  className="space-y-6">
                  <div className="space-y-2">
                    <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                      Email Address
                    </Label>
                    <div className="relative group">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-cyan-600 transition-colors duration-300" />
                      <Input
                        {...emailForm.register("email")}
                        className={`pl-11 h-12 rounded-xl bg-slate-50/50 border-slate-200 text-slate-900 font-medium focus:bg-white focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 transition-all duration-300 ${
                          emailForm.formState.errors.email
                            ? "border-red-300 bg-red-50/30 focus:border-red-500 focus:ring-red-500/10"
                            : ""
                        }`}
                        placeholder="doctor@clinic.com"
                        autoFocus
                      />
                    </div>
                    {emailForm.formState.errors.email && (
                      <p className="text-xs text-red-600 font-bold flex items-center gap-1.5 mt-1 animate-in slide-in-from-top-1">
                        <AlertCircle className="h-3.5 w-3.5" />
                        Valid email required
                      </p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full h-12 rounded-xl text-sm font-bold bg-slate-900 hover:bg-cyan-600 text-white shadow-md hover:shadow-xl hover:shadow-cyan-500/20 transition-all duration-300 active:scale-[0.98]">
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
                    <strong className="text-slate-900">{email}</strong>.
                  </p>
                </div>

                <form
                  onSubmit={resetForm.handleSubmit(onReset)}
                  className="space-y-6">
                  <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 space-y-5 shadow-inner">
                    <div className="space-y-2">
                      <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                        <KeyRound className="h-3.5 w-3.5" /> Verification Code
                      </Label>
                      <Input
                        {...resetForm.register("otp")}
                        className="h-14 text-center text-2xl tracking-[0.5em] font-mono font-bold bg-white border-slate-200 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 rounded-xl transition-all"
                        placeholder="000000"
                        maxLength={6}
                        autoFocus
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                        New Password
                      </Label>
                      <div className="relative group">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-cyan-600 transition-colors" />
                        <Input
                          type="password"
                          {...resetForm.register("newPassword")}
                          className="pl-11 h-12 rounded-xl bg-slate-50/50 border-slate-200 text-slate-900 font-medium focus:bg-white focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 transition-all"
                          placeholder="Minimum 8 characters"
                        />
                      </div>
                      {resetForm.formState.errors.newPassword && (
                        <p className="text-xs text-red-600 font-bold flex items-center gap-1.5 mt-1">
                          <AlertCircle className="h-3.5 w-3.5" />
                          {
                            resetForm.formState.errors.newPassword
                              .message as string
                          }
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                        Confirm Password
                      </Label>
                      <div className="relative group">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-cyan-600 transition-colors" />
                        <Input
                          type="password"
                          {...resetForm.register("confirmPassword")}
                          className={`pl-11 h-12 rounded-xl bg-slate-50/50 border-slate-200 text-slate-900 font-medium focus:bg-white focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 transition-all ${
                            resetForm.formState.errors.confirmPassword
                              ? "border-red-300 bg-red-50/30"
                              : ""
                          }`}
                          placeholder="Repeat new password"
                        />
                      </div>
                      {resetForm.formState.errors.confirmPassword && (
                        <p className="text-xs text-red-600 font-bold flex items-center gap-1.5 mt-1 animate-in slide-in-from-top-1">
                          <AlertCircle className="h-3.5 w-3.5" />
                          Passwords do not match
                        </p>
                      )}
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full h-12 rounded-xl text-sm font-bold bg-slate-900 hover:bg-cyan-600 text-white shadow-md hover:shadow-xl hover:shadow-cyan-500/20 transition-all duration-300 active:scale-[0.98]">
                    {loading ? (
                      <Loader2 className="animate-spin h-5 w-5" />
                    ) : (
                      "Update Password & Login"
                    )}
                  </Button>
                </form>

                {/* Resend Action */}
                <div className="pt-4 text-center">
                  <button
                    type="button"
                    onClick={() => onSendOtp({ email })}
                    disabled={timer > 0}
                    className={`inline-flex items-center justify-center gap-2 text-sm font-bold transition-colors ${
                      timer > 0
                        ? "text-slate-400 cursor-not-allowed"
                        : "text-cyan-600 hover:text-cyan-800"
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
        </div>
      </div>
    </div>
  );
}
