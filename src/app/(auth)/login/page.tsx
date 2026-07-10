"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Activity,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle2,
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
      // Hard navigation guarantees the auth cookie is re-evaluated server-side before the dashboard renders
      window.location.href = data.redirect || "/dashboard";
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex w-full bg-white font-sans">
      {/* LEFT COLUMN: Login Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-8 sm:px-16 md:px-24 xl:px-32 relative">
        {/* Top Logo (Mobile/Tablet) */}
        <div className="absolute top-8 left-8 flex items-center gap-2 lg:hidden">
          <div className="bg-blue-600 p-1.5 rounded-lg">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-gray-900 tracking-tight">
            Patholab.cloud
          </span>
        </div>

        <div className="w-full max-w-md mx-auto">
          <div className="mb-10">
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-2">
              Welcome back
            </h1>
            <p className="text-gray-500">
              Enter your credentials to access your secure workspace.
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm rounded-r-md">
              <p className="font-medium">Authentication Failed</p>
              <p>{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            {/* Email Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-colors sm:text-sm"
                  placeholder="admin@patholab.cloud"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-sm font-medium text-blue-600 hover:text-blue-500">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-colors sm:text-sm"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600">
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600 disabled:opacity-70 disabled:cursor-not-allowed transition-all">
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Authenticating...
                </>
              ) : (
                "Sign in to Workspace"
              )}
            </button>
          </form>

          {/* Signup Link */}
          <div className="mt-8 pt-6 border-t border-gray-100 text-center">
            <p className="text-sm text-gray-600">
              Don't have a lab account yet?{" "}
              <Link
                href="/register"
                className="font-semibold text-blue-600 hover:text-blue-500 transition-colors">
                Create one for free
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Marketing & Branding (Hidden on Mobile) */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-blue-700 via-blue-800 to-indigo-900 overflow-hidden">
        {/* Background Decorative Patterns */}
        <div className="absolute top-0 left-0 w-full h-full opacity-10">
          <svg
            className="w-full h-full"
            viewBox="0 0 100 100"
            preserveAspectRatio="none">
            <path
              d="M0,100 C30,60 70,60 100,100 L100,0 L0,0 Z"
              fill="currentColor"
            />
          </svg>
        </div>

        <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-20"></div>

        <div className="relative w-full flex flex-col justify-between p-12 lg:p-16 xl:p-24 z-10 text-white">
          {/* Logo Component */}
          <div className="flex items-center gap-2">
            <div className="bg-white/10 p-2 rounded-xl backdrop-blur-sm border border-white/20">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold tracking-tight">
              Patholab.cloud
            </span>
          </div>

          {/* Marketing Copy for the Pivot */}
          <div className="mt-auto mb-auto">
            <span className="inline-block py-1 px-3 rounded-full bg-blue-500/30 border border-blue-400/30 text-blue-100 text-sm font-semibold mb-6 backdrop-blur-md">
              Now Fully Pay-As-You-Go
            </span>
            <h2 className="text-4xl xl:text-5xl font-extrabold tracking-tight mb-6 leading-tight">
              Zero Subscriptions.
              <br />
              Zero Limits.
            </h2>
            <p className="text-lg xl:text-xl text-blue-100 mb-10 max-w-lg leading-relaxed">
              Experience the first enterprise LIMS in India that scales with
              you. No monthly fees—just load your wallet and pay a flat ₹2.5 per
              patient.
            </p>

            <div className="space-y-4">
              <div className="flex items-center gap-3 text-blue-50">
                <CheckCircle2 className="w-6 h-6 text-blue-300 flex-shrink-0" />
                <span className="text-lg">
                  Unlimited Branches & Collection Centers
                </span>
              </div>
              <div className="flex items-center gap-3 text-blue-50">
                <CheckCircle2 className="w-6 h-6 text-blue-300 flex-shrink-0" />
                <span className="text-lg">
                  Unlimited Staff & Technician Accounts
                </span>
              </div>
              <div className="flex items-center gap-3 text-blue-50">
                <CheckCircle2 className="w-6 h-6 text-blue-300 flex-shrink-0" />
                <span className="text-lg">
                  Access to RIS, B2B Billing & Inventory
                </span>
              </div>
            </div>
          </div>

          {/* Bottom Trust Text */}
          <div className="text-sm text-blue-200/60 font-medium">
            © {new Date().getFullYear()} Globizhub India Pvt. Ltd. All rights
            reserved.
          </div>
        </div>
      </div>
    </div>
  );
}
