"use client";

import { useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Loader2,
  Mailbox,
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
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
    if (code.length < 6) return setError("Please enter the 6-digit code.");
    if (!email) return setError("Email is missing.");

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

      toast.success("Account verified! Redirecting...");
      router.push("/login?verified=true");
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) return;
    setResendLoading(true);
    try {
      const res = await fetch("/api/auth/otp/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.toLowerCase().trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("New code sent to your email!");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-white p-8 rounded-3xl shadow-xl border border-slate-100">
      <Link
        href="/register"
        className="inline-flex items-center text-sm text-gray-500 mb-6 hover:text-blue-600">
        <ArrowLeft className="w-4 h-4 mr-1" /> Back
      </Link>

      <div className="flex items-center gap-4 mb-6">
        <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-600">
          <Mailbox className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Verify Code</h1>
          <p className="text-sm text-gray-500">
            Check your inbox for the 6-digit OTP.
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          className="w-full p-3 border rounded-lg bg-gray-50 text-gray-600"
          readOnly={!!initialEmail}
        />

        <div
          className="flex justify-between gap-2"
          onPaste={(e) => {
            const pasted = e.clipboardData
              .getData("text")
              .slice(0, 6)
              .split("");
            setOtp(pasted);
          }}>
          {otp.map((digit, idx) => (
            <input
              key={idx}
              ref={(el) => (inputRefs.current[idx] = el)}
              type="text"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(idx, e.target.value)}
              onKeyDown={(e) => handleKeyDown(idx, e)}
              className="w-12 h-14 text-center text-xl font-bold border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          ))}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold">
          {loading ? <Loader2 className="animate-spin mx-auto" /> : "Verify"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        Didn't receive it?{" "}
        <button
          onClick={handleResend}
          disabled={resendLoading}
          className="text-blue-600 font-bold hover:underline">
          Resend Code
        </button>
      </p>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<Loader2 className="animate-spin" />}>
      <VerificationForm />
    </Suspense>
  );
}
