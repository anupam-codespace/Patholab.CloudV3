"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import {
  Activity,
  Loader2,
  Eye,
  EyeOff,
  Lock,
  Mail,
  ArrowRight,
  AlertCircle,
  Sparkles,
  TestTube2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

const schema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema) });

  const onSubmit = async (data: any) => {
    setLoading(true);
    try {
      const payload = { ...data, rememberMe };

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await res.json();

      if (!res.ok) {
        const errMsg = result.error || "Login failed";

        // === 🚀 SMART REDIRECT LOGIC ===
        // If the backend says the user isn't fully setup, send them back to the wizard
        if (errMsg.includes("verify your email")) {
          toast.error("Email not verified. Redirecting...");
          setTimeout(() => router.push(`/register?step=3`), 1500);
          return;
        }
        if (errMsg.includes("Lab Setup")) {
          toast.error("Lab details missing. Redirecting...");
          setTimeout(() => router.push(`/register?step=4`), 1500);
          return;
        }
        if (errMsg.includes("Payment pending")) {
          toast.error("Subscription pending. Redirecting to payment...");
          setTimeout(() => router.push(`/register?step=5`), 1500);
          return;
        }

        // Normal error (wrong password, etc)
        throw new Error(errMsg);
      }

      // === SUCCESSFUL LOGIN ===
      toast.success("Welcome back!");

      const role = result.user?.role || "";

      if (role === "LAB_OWNER") {
        router.push("/workspace/patients");
      } else if (role === "SUPER_ADMIN") {
        router.push("/admin");
      } else if (result.redirect) {
        router.push(result.redirect);
      } else {
        router.push("/");
      }

      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex w-full bg-white selection:bg-indigo-500 selection:text-white">
      {/* === LEFT PANEL: BRANDING (Hidden on Mobile) === 
        A premium, deep SaaS gradient panel that builds trust before they even log in.
      */}
      <div className="hidden lg:flex w-1/2 relative overflow-hidden bg-slate-950 flex-col justify-between p-12">
        {/* Abstract Background Gradients */}
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-600/30 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-violet-600/20 rounded-full blur-[120px] pointer-events-none"></div>

        {/* Subtle Grid Overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>

        <div className="relative z-10 flex items-center gap-3">
          <div className="bg-white/10 backdrop-blur-md p-2.5 rounded-xl border border-white/20">
            <Activity className="h-6 w-6 text-indigo-400" />
          </div>
          <span className="text-2xl font-extrabold tracking-tight text-white">
            patholab<span className="text-indigo-400">.cloud</span>
          </span>
        </div>

        <div className="relative z-10 space-y-6 max-w-lg">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold tracking-wide uppercase">
            <Sparkles className="h-3.5 w-3.5" />
            LIMS Reimagined
          </div>
          <h2 className="text-4xl leading-[1.1] font-bold text-white tracking-tight">
            The intelligent operating system for modern diagnostic centers.
          </h2>
          <p className="text-lg text-slate-400 font-light">
            Automate reporting, scale your B2B network, and manage your IoT
            analyzers with zero latency.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-4 text-sm font-medium text-slate-500">
          <TestTube2 className="h-5 w-5 text-slate-600" />
          Trusted by 500+ labs across India.
        </div>
      </div>

      {/* === RIGHT PANEL: LOGIN FORM === 
        Clean, minimalist, high-contrast form area.
      */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-6 sm:p-12 relative">
        <div className="w-full max-w-[400px] space-y-10">
          {/* Mobile-only Logo */}
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="bg-indigo-50 p-2 rounded-lg border border-indigo-100">
              <Activity className="h-5 w-5 text-indigo-600" />
            </div>
            <span className="text-xl font-extrabold tracking-tight text-slate-900">
              patholab.cloud
            </span>
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
              Welcome back
            </h1>
            <p className="text-sm text-slate-500 font-medium">
              Enter your credentials to securely access your dashboard.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Form Group: Email */}
            <div className="space-y-2">
              <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                Email Address
              </Label>
              <div className="relative group">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors duration-300" />
                <Input
                  {...register("email")}
                  className={`pl-11 h-12 rounded-xl bg-slate-50/50 border-slate-200 text-slate-900 font-medium focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all duration-300 ${
                    errors.email
                      ? "border-red-300 focus:border-red-500 focus:ring-red-500/10 bg-red-50/30"
                      : ""
                  }`}
                  placeholder="doctor@clinic.com"
                />
              </div>
              {errors.email && (
                <p className="text-xs text-red-600 font-bold flex items-center gap-1.5 animate-in slide-in-from-top-1">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {errors.email.message as string}
                </p>
              )}
            </div>

            {/* Form Group: Password */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                  Password
                </Label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-indigo-600 hover:text-indigo-700 font-bold transition-colors">
                  Forgot password?
                </Link>
              </div>
              <div className="relative group">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors duration-300" />
                <Input
                  {...register("password")}
                  type={showPass ? "text" : "password"}
                  className={`pl-11 pr-11 h-12 rounded-xl bg-slate-50/50 border-slate-200 text-slate-900 font-medium focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all duration-300 ${
                    errors.password
                      ? "border-red-300 focus:border-red-500 focus:ring-red-500/10 bg-red-50/30"
                      : ""
                  }`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors">
                  {showPass ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-red-600 font-bold flex items-center gap-1.5 animate-in slide-in-from-top-1">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {errors.password.message as string}
                </p>
              )}
            </div>

            {/* Remember Me */}
            <div className="flex items-center space-x-3 pt-1">
              <Checkbox
                id="remember"
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                className="h-5 w-5 rounded-md border-slate-300 text-indigo-600 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600 transition-all"
              />
              <label
                htmlFor="remember"
                className="text-sm font-semibold text-slate-600 cursor-pointer select-none">
                Keep me signed in for 30 days
              </label>
            </div>

            {/* Submit Action */}
            <div className="pt-4">
              <Button
                type="submit"
                className="w-full h-12 rounded-xl text-sm font-bold bg-slate-900 hover:bg-indigo-600 text-white shadow-md hover:shadow-xl hover:shadow-indigo-500/20 transition-all duration-300 active:scale-[0.98]"
                disabled={loading}>
                {loading ? (
                  <Loader2 className="animate-spin h-5 w-5" />
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    Sign In Securely <ArrowRight className="h-4 w-4" />
                  </span>
                )}
              </Button>
            </div>
          </form>

          {/* Footer Area */}
          <div className="pt-8 border-t border-slate-100 flex flex-col items-center gap-6">
            <p className="text-sm font-medium text-slate-600">
              Don't have a lab account?{" "}
              <Link
                href="/register"
                className="text-indigo-600 font-bold hover:text-indigo-800 transition-colors">
                Start 03-Day Free Trial
              </Link>
            </p>

            <div className="flex items-center gap-6 text-xs font-semibold text-slate-400">
              <Link
                href="/privacy-policy"
                className="hover:text-slate-800 transition-colors">
                Privacy
              </Link>
              <span className="h-1 w-1 rounded-full bg-slate-300"></span>
              <Link
                href="/terms-conditions"
                className="hover:text-slate-800 transition-colors">
                Terms
              </Link>
              <span className="h-1 w-1 rounded-full bg-slate-300"></span>
              <Link
                href="/contact"
                className="hover:text-slate-800 transition-colors">
                Support
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
