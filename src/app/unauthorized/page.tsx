"use client";

import Link from "next/link";
import { ShieldAlert, ArrowLeft, LockKeyhole, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

export default function UnauthorizedPage() {
  const router = useRouter();

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
              <LockKeyhole className="h-5 w-5 text-slate-400 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Why am I seeing this?
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  You might be logged in as a user who doesn't have{" "}
                  <strong>Super Admin</strong> or <strong>Lab Owner</strong>{" "}
                  privileges for this specific page.
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

                {/* Logout Button (Using API) */}
                <form
                  action="/api/auth/logout"
                  method="POST"
                  className="w-full">
                  <button
                    type="submit"
                    className="w-full flex items-center justify-center gap-2 bg-red-50 border border-red-100 hover:bg-red-100 text-red-600 font-medium py-3 rounded-lg transition-all">
                    <LogOut className="h-4 w-4" />
                    Logout
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-slate-400 text-xs">
            Globiz Patholab Protection System • Event ID:{" "}
            <span className="font-mono text-slate-500">403_FORBIDDEN</span>
          </p>
        </div>
      </div>
    </div>
  );
}
