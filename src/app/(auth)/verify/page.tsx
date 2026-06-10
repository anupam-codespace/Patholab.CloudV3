"use client";

import { useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Activity,
  Loader2,
  CheckCircle2,
  ShieldCheck,
  Mailbox,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast"; // ✅ Added Toast Import (Change to 'sonner' if you use that)

function VerificationForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const userId = searchParams.get("userId");

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Handle OTP Input
  const handleChange = (index: number, value: string) => {
    if (isNaN(Number(value))) return; // Only allow numbers

    const newOtp = [...otp];
    // Take only the last character if they type fast
    newOtp[index] = value.substring(value.length - 1);
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5 && inputRefs.current[index + 1]) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    // Auto-focus previous input on backspace if current is empty
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData
      .getData("text")
      .trim()
      .slice(0, 6)
      .split("");

    if (pastedData.some((char) => isNaN(Number(char)))) return;

    const newOtp = [...otp];
    pastedData.forEach((char, i) => {
      if (i < 6) newOtp[i] = char;
    });
    setOtp(newOtp);

    // Focus the last filled input or the next empty one
    const focusIndex = Math.min(pastedData.length, 5);
    inputRefs.current[focusIndex]?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = otp.join("");

    if (code.length < 6) {
      setError("Please enter the complete 6-digit code.");
      return;
    }

    if (!userId) {
      setError("Missing user session. Please try registering again.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccessMsg("");

    try {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, code }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Verification failed");

      // ✅ 1. Show Toast
      toast.success("Account verified successfully! 🎉");

      // ✅ 2. Show inline success message
      setSuccessMsg("Account verified! Redirecting you to login...");

      // ✅ 3. Delay redirect so user can actually see the success messages
      setTimeout(() => {
        router.push("/login?verified=true");
      }, 2000);
    } catch (err: any) {
      setError(err.message);
      setLoading(false); // Only stop loading if there is an error
    }
  };

  const handleResend = async () => {
    if (!userId) return;
    setResendLoading(true);
    setError("");
    setSuccessMsg("");

    try {
      const res = await fetch("/api/auth/otp/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to resend code");

      toast.success("New code sent!"); // ✅ Added Toast for resend
      setSuccessMsg("A new verification code has been sent to your email.");
    } catch (err: any) {
      toast.error(err.message);
      setError(err.message);
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex w-full bg-slate-50 font-sans">
      {/* LEFT: Marketing / Value Prop */}
      <div className="hidden lg:flex lg:w-5/12 bg-blue-900 p-12 flex-col justify-between text-white">
        <div className="flex items-center gap-2">
          <Activity className="w-8 h-8 text-blue-400" />
          <span className="text-2xl font-bold">Patholab.cloud</span>
        </div>

        <div>
          <div className="w-16 h-16 bg-blue-800 rounded-2xl flex items-center justify-center mb-8 shadow-inner">
            <ShieldCheck className="w-8 h-8 text-blue-300" />
          </div>
          <h2 className="text-4xl font-extrabold mb-6 leading-tight">
            Bank-grade security for your medical data.
          </h2>
          <div className="space-y-6 text-blue-100">
            {[
              "End-to-end 256-bit encryption",
              "HIPAA & ABDM compliant infrastructure",
              "Automated daily secure backups",
              "Strict role-based access control",
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-green-400 shrink-0" />
                <span className="text-lg">{item}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="text-blue-300 text-sm">
          Your patients' trust is your most valuable asset. We help you protect
          it.
        </p>
      </div>

      {/* RIGHT: Verification Form */}
      <div className="w-full lg:w-7/12 flex items-center justify-center p-8">
        <div className="w-full max-w-lg bg-white p-8 sm:p-12 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 relative overflow-hidden">
          {/* Decorative background element */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-50 rounded-full blur-3xl opacity-50 pointer-events-none"></div>

          <Link
            href="/register"
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors mb-8">
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>

          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center shrink-0">
              <Mailbox className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Check your email
              </h1>
              <p className="text-gray-500 mt-1">
                We've sent a 6-digit verification code.
              </p>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100 font-medium">
              {error}
            </div>
          )}

          {successMsg && (
            <div className="mb-6 p-4 bg-green-50 text-green-700 rounded-xl text-sm border border-green-100 font-medium flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              {successMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-3">
              <label className="block text-sm font-bold text-gray-700 text-center">
                Enter Verification Code
              </label>

              {/* 6-Digit OTP Input Boxes */}
              <div
                className="flex justify-between gap-2 sm:gap-3"
                onPaste={handlePaste}>
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => {
                      inputRefs.current[index] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={1}
                    value={digit}
                    disabled={loading && !error} // ✅ Disable inputs while verifying
                    onChange={(e) => handleChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    className="w-full h-14 sm:h-16 text-center text-2xl font-bold text-gray-900 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none transition-all bg-slate-50 focus:bg-white disabled:opacity-50"
                  />
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || otp.join("").length < 6}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl transition-all flex justify-center items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-md shadow-blue-600/20">
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />{" "}
                  {successMsg ? "Redirecting..." : "Verifying..."}
                </>
              ) : (
                "Verify Account"
              )}
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-gray-100 text-center">
            <p className="text-sm text-gray-500">
              Didn't receive the code?{" "}
              <button
                onClick={handleResend}
                disabled={resendLoading || (loading && !error)}
                className="text-blue-600 font-semibold hover:underline disabled:opacity-50 inline-flex items-center gap-1">
                {resendLoading ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : null}
                Click to resend
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Wrapping in Suspense is required for useSearchParams in Next.js App Router
export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      }>
      <VerificationForm />
    </Suspense>
  );
}
