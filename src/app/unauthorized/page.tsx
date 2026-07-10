"use client";

import Link from "next/link";
import {
  ShieldAlert,
  ArrowLeft,
  LockKeyhole,
  LogOut,
  ShieldX,
} from "lucide-react";
import { useRouter } from "next/navigation";

export default function UnauthorizedPage() {
  const router = useRouter();

  // ✅ ADDED: Client-side logout handler to properly clear session and redirect
  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
      });
      // Force redirect to login page after successful API call
      router.push("/login");
      router.refresh(); // Optional: clears Next.js router cache
    } catch (error) {
      console.error("Logout failed:", error);
      // Fallback redirect just in case
      router.push("/login");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      {/* Background Pattern */}
      <div
        className="absolute inset-0 z-0 opacity-[0.03]"
        style={{
          backgroundImage: "radial-gradient(#3b82f6 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}></div>

      <div className="relative z-10 w-full max-w-lg">
        {/* Top Branding Pill */}
        <div className="flex justify-center mb-8">
          <div className="bg-white px-4 py-1.5 rounded-full shadow-sm border border-slate-200 flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse"></div>
            <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
              System Security
            </span>
          </div>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 overflow-hidden border border-slate-100">
          {/* Header Section */}
          <div className="bg-red-50 p-8 text-center border-b border-red-100">
            <div className="mx-auto bg-white w-20 h-20 rounded-full flex items-center justify-center shadow-sm mb-4">
              <ShieldAlert className="h-10 w-10 text-red-500" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">
              Access Restricted
            </h1>
            <p className="text-slate-600">
              You do not have the necessary permissions to view this area.
            </p>
          </div>

          {/* Details Section */}
          <div className="p-8 space-y-6">
            <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-lg border border-slate-100">
              <ShieldX className="h-5 w-5 text-slate-500 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Why am I seeing this?
                </h3>
                {/* ✅ UPDATED: Detailed access explanations */}
                <ul className="text-sm text-slate-600 mt-2 space-y-2 list-disc list-inside">
                  <li>
                    You are attempting to access a module (like Financials or
                    Settings) reserved strictly for <strong>Lab Owners</strong>{" "}
                    or <strong>Super Admins</strong>.
                  </li>
                  <li>
                    You are restricted to a specific <strong>Branch</strong> and
                    cannot view Master Lab configurations.
                  </li>
                  <li>
                    Your current assigned role (e.g., Receptionist,
                    Phlebotomist) does not have read/write clearance for this
                    specific page.
                  </li>
                </ul>
                <p className="text-sm text-slate-500 mt-3 border-t border-slate-200 pt-3">
                  If you believe this is a mistake, please contact your Lab
                  Administrator to update your role permissions.
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={() => router.back()}
                className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-medium py-3 rounded-lg transition-all">
                <ArrowLeft className="h-4 w-4" />
                Go Back
              </button>

              <div className="grid grid-cols-2 gap-3">
                <Link
                  href="/"
                  className="flex items-center justify-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium py-3 rounded-lg transition-all">
                  Dashboard
                </Link>

                {/* ✅ UPDATED: Logout Button triggers client-side handler */}
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 bg-red-50 border border-red-100 hover:bg-red-100 text-red-600 font-medium py-3 rounded-lg transition-all">
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-slate-400 text-xs">
            Patholab Protection System • Event ID:{" "}
            <span className="font-mono text-slate-500">403_FORBIDDEN</span>
          </p>
        </div>
      </div>
    </div>
  );
}
