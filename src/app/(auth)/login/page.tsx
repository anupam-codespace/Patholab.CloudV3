"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  ShieldCheck,
  AlertCircle,
  CheckCircle2
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(
          data.error || "Failed to log in. Please check your credentials.",
        );
        setLoading(false);
        return;
      }

      // Success! Redirect based on the API response
      window.location.href = data.redirect || "/dashboard";
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex w-full bg-white font-sans overflow-hidden">
      {/* ========================================================= */}
      {/* LEFT COLUMN: Login Form (Mobile Friendly)                   */}
      {/* ========================================================= */}
      <div className="w-full lg:w-1/2 flex flex-col justify-between px-6 sm:px-16 md:px-24 py-8 lg:py-12 relative z-10 bg-white">
        {/* 1. TOP LOGO AREA */}
        <div className="flex items-center gap-3 mb-10 lg:mb-0">
          <img
            src="/images/patholab-logo.png"
            alt="Patholab.cloud Logo"
            className="h-10 md:h-12 w-auto object-contain"
            onError={(e) => {
              // Fallback text if image isn't loaded yet
              e.currentTarget.style.display = "none";
              e.currentTarget.parentElement?.classList.add("fallback-logo");
            }}
          />
          <span className="text-2xl font-extrabold text-slate-900 tracking-tight hidden fallback-logo-text">
            Patholab.cloud
          </span>
        </div>

        {/* Center Form Container */}
        <div className="w-full max-w-sm mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">
              Welcome back
            </h1>
            <p className="text-sm text-slate-500 font-medium">
              Enter your credentials to access your workspace.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold text-red-800">Login Failed</h3>
                <p className="text-xs text-red-600 mt-1">{error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            {/* Email Field */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                  placeholder="admin@patholab.cloud"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors">
                  Forgot Password?
                </Link>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors">
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 flex justify-center items-center mt-6 rounded-xl shadow-md shadow-blue-500/20 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600 disabled:opacity-70 disabled:cursor-not-allowed transition-all">
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Authenticating...
                </>
              ) : (
                "Access Workspace"
              )}
            </button>
          </form>

          {/* Signup Link */}
          <div className="mt-8 text-center">
            <p className="text-sm text-slate-500 font-medium">
              Don't have a lab account yet?{" "}
              <Link
                href="/register"
                className="font-bold text-blue-600 hover:text-blue-700 transition-colors underline underline-offset-2">
                Create one for free
              </Link>
            </p>
          </div>
        </div>

        {/* Footer & Trust Badges */}
        <div className="mt-12 lg:mt-0 space-y-8">
          {/* 2. MAKE IN INDIA & ISO LOGO GRID */}
          <div className="flex flex-wrap items-center justify-center gap-6 lg:gap-8 opacity-75 grayscale hover:grayscale-0 transition-all duration-500 select-none">
            {/* Make in India */}
            <img
              src="/images/make-in-india.png"
              alt="Make in India"
              title="Make in India"
              className="h-10 md:h-12 w-auto object-contain drop-shadow-sm hover:scale-105 transition-transform"
            />

            {/* ISO 9001:2015 */}
            <img
              src="/images/iso-9001.png"
              alt="ISO 9001:2015 Certified"
              title="ISO 9001:2015"
              className="h-10 md:h-12 w-auto object-contain drop-shadow-sm hover:scale-105 transition-transform"
            />

            {/* ISO/IEC 27001:2022 */}
            <img
              src="/images/iso-27001.png"
              alt="ISO/IEC 27001:2022 Certified"
              title="ISO/IEC 27001:2022"
              className="h-10 md:h-12 w-auto object-contain drop-shadow-sm hover:scale-105 transition-transform"
            />

            {/* ISO 20000-1:2018 */}
            <img
              src="/images/iso-20000.png"
              alt="ISO 20000-1:2018 Certified"
              title="ISO 20000-1:2018"
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
        {/* 3. YOUR CUSTOM DESKTOP BACKGROUND IMAGE */}
        <div className="absolute inset-0">
          <img
            src="/images/login-bg.jpg"
            alt="Patholab Cloud UI"
            className="w-full h-full object-cover opacity-50 mix-blend-overlay transition-opacity duration-1000"
          />
          {/* Subtle gradient overlay to make the text pop */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-[#0f172a]/60 to-blue-900/30"></div>
        </div>

        {/* Marketing Content overlaying the image */}
        <div className="relative w-full flex flex-col justify-end p-16 z-10 text-white pb-24">
          <div className="max-w-lg">
            <span className="inline-flex items-center py-1.5 px-3.5 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-200 text-xs font-bold mb-6 backdrop-blur-md uppercase tracking-wider shadow-sm">
              <ShieldCheck className="w-4 h-4 mr-2 text-blue-300" />
              Enterprise-Grade Security
            </span>

            <h2 className="text-4xl font-extrabold tracking-tight mb-4 leading-tight text-white drop-shadow-md">
              Scale your lab with zero subscriptions.
            </h2>

            <p className="text-lg text-slate-300 mb-10 leading-relaxed font-medium drop-shadow-sm">
              Experience the first enterprise LIMS in India that scales
              dynamically with you. Load your wallet and pay a flat ₹2.5 per
              patient.
            </p>

            <div className="space-y-4">
              <div className="flex items-center gap-3 bg-white/5 border border-white/10 p-3.5 rounded-xl backdrop-blur-md hover:bg-white/10 transition-colors">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                <span className="text-sm font-semibold text-slate-100">
                  Unlimited Branches & Collection Centers
                </span>
              </div>
              <div className="flex items-center gap-3 bg-white/5 border border-white/10 p-3.5 rounded-xl backdrop-blur-md hover:bg-white/10 transition-colors">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                <span className="text-sm font-semibold text-slate-100">
                  Unlimited Staff & Technician Accounts
                </span>
              </div>
              <div className="flex items-center gap-3 bg-white/5 border border-white/10 p-3.5 rounded-xl backdrop-blur-md hover:bg-white/10 transition-colors">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                <span className="text-sm font-semibold text-slate-100">
                  Full Access to RIS, B2B Billing & Inventory
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}