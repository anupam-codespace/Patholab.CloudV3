"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Activity,
  Mail,
  Lock,
  User,
  Phone,
  Loader2,
  CheckCircle2,
} from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Registration failed");

      // Redirect to verification with the userId
      router.push(`/verify?userId=${data.userId}`);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
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
          <h2 className="text-4xl font-extrabold mb-6">
            Start your lab's digital journey.
          </h2>
          <div className="space-y-6">
            {[
              "Zero setup fees, start in minutes",
              "Flat ₹2.5 per patient pay-as-you-go",
              "Unlimited branches and staff users",
              "Enterprise-grade LIMS & RIS included",
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-green-400" />
                <span className="text-lg">{item}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="text-blue-300 text-sm">
          Join 500+ labs scaling with Patholab.
        </p>
      </div>

      {/* RIGHT: Registration Form */}
      <div className="w-full lg:w-7/12 flex items-center justify-center p-8">
        <div className="w-full max-w-lg bg-white p-8 sm:p-12 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Create your account
          </h1>
          <p className="text-gray-500 mb-8">
            Get full access to the Patholab ecosystem.
          </p>

          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    required
                    className="w-full pl-10 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-600 outline-none"
                    placeholder="Dr. John Doe"
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input
                    type="tel"
                    required
                    className="w-full pl-10 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-600 outline-none"
                    placeholder="+91 98765 43210"
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input
                  type="email"
                  required
                  className="w-full pl-10 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-600 outline-none"
                  placeholder="you@lab.com"
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input
                  type="password"
                  required
                  className="w-full pl-10 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-600 outline-none"
                  placeholder="••••••••"
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl transition-all flex justify-center items-center gap-2">
              {loading ? (
                <>
                  <Loader2 className="animate-spin" /> Registering...
                </>
              ) : (
                "Create Account"
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-blue-600 font-semibold hover:underline">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
