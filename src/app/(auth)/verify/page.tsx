"use client";

import { useState, useRef, Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Mailbox, ArrowLeft, AlertCircle } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

function VerificationForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Use email from URL or state
  const initialEmail = searchParams.get("email") || "";
  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Focus on the first OTP input automatically
  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  // OTP Change Logic
  const handleChange = (index: number, value: string) => {
    if (isNaN(Number(value))) return;
    const newOtp = [...otp];
    newOtp[index] = value.substring(value.length - 1);
    setOtp(newOtp);
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = otp.join("");
    if (code.length < 6)
      return setError("Please enter the complete 6-digit code.");
    if (!email) return setError("Email address is missing.");

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.toLowerCase().trim(), code }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Verification failed");

      toast.success("Account verified successfully! Redirecting...");
      router.push("/login?verified=true");
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) {
      toast.error("Please enter your email to resend the code.");
      return;
    }
    setResendLoading(true);
    try {
      const res = await fetch("/api/auth/otp/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.toLowerCase().trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("A new 6-digit code has been sent to your email!");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[440px] bg-white p-8 sm:p-10 rounded-[2rem] shadow-2xl shadow-slate-200/50 border border-slate-100 relative z-10">
      {/* Back Button */}
      <Link
        href="/register"
        className="inline-flex items-center text-xs font-bold uppercase tracking-wider text-slate-400 mb-8 hover:text-blue-600 transition-colors">
        <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Sign Up
      </Link>

      <div className="flex flex-col items-center text-center mb-8">
        <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 mb-5 shadow-sm border border-blue-100">
          <Mailbox className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight mb-2">
          Check your inbox
        </h1>
        <p className="text-sm text-slate-500 font-medium">
          We've sent a 6-digit secure verification code to <br />
          <span className="text-slate-800 font-bold">
            {email || "your email address"}
          </span>
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm font-semibold flex items-center gap-2 animate-in fade-in zoom-in-95">
          <AlertCircle className="w-5 h-5 shrink-0" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Hidden Email Field (Only visible if URL params are missing) */}
        {!initialEmail && (
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Confirm Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@patholab.cloud"
              className="w-full p-3.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 font-medium outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>
        )}

        <div
          className="flex justify-between gap-2 sm:gap-3"
          onPaste={(e) => {
            const pasted = e.clipboardData
              .getData("text")
              .replace(/\D/g, "") // Only allow numbers
              .slice(0, 6)
              .split("");

            const newOtp = [...otp];
            pasted.forEach((digit, i) => {
              newOtp[i] = digit;
            });
            setOtp(newOtp);

            // Focus last filled input
            const nextIndex = Math.min(pasted.length, 5);
            inputRefs.current[nextIndex]?.focus();
          }}>
          {otp.map((digit, idx) => (
            <input
              key={idx}
              ref={(el) => (inputRefs.current[idx] = el)}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(idx, e.target.value)}
              onKeyDown={(e) => handleKeyDown(idx, e)}
              className={`w-full aspect-square text-center text-2xl font-black rounded-xl border bg-slate-50 outline-none transition-all duration-200
                ${digit ? "border-blue-500 bg-white ring-2 ring-blue-500/20 text-blue-600" : "border-slate-200 text-slate-900 focus:border-blue-400 focus:bg-white"}
              `}
            />
          ))}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full h-12 flex items-center justify-center bg-blue-600 text-white rounded-xl font-bold shadow-md shadow-blue-500/20 hover:bg-blue-700 disabled:opacity-70 transition-all">
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            "Verify Account"
          )}
        </button>
      </form>

      <p className="mt-8 text-center text-sm font-medium text-slate-500">
        Didn't receive the code?{" "}
        <button
          type="button"
          onClick={handleResend}
          disabled={resendLoading}
          className="text-blue-600 font-bold hover:text-blue-700 hover:underline underline-offset-2 transition-all disabled:opacity-50">
          {resendLoading ? "Sending..." : "Click to resend"}
        </button>
      </p>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 relative overflow-hidden font-sans selection:bg-blue-200 p-4">
      {/* Background Decorators */}
      <div className="absolute top-0 left-0 w-full h-[400px] bg-gradient-to-b from-blue-600/10 to-transparent pointer-events-none" />
      <div className="absolute -top-[20%] -right-[10%] w-[50%] h-[50%] rounded-full bg-blue-400/10 blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-indigo-400/10 blur-[120px] pointer-events-none" />

      {/* Top Floating Logo */}
      <div className="absolute top-8 left-8 flex items-center gap-3 z-20">
        <img
          src="/images/patholab-logo.jpg"
          alt="Patholab.cloud Logo"
          className="h-10 w-auto object-contain drop-shadow-sm"
          onError={(e) => {
            e.currentTarget.style.display = "none";
            e.currentTarget.parentElement?.classList.add("fallback-logo");
          }}
        />
        <span className="text-xl font-extrabold text-slate-900 tracking-tight hidden fallback-logo-text">
          Patholab.cloud
        </span>
      </div>

      <Suspense
        fallback={<Loader2 className="w-8 h-8 animate-spin text-blue-600" />}>
        <VerificationForm />
      </Suspense>
    </div>
  );
}
